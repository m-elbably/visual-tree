import Konva from 'konva';
import { IRect, Vector2d} from 'konva/lib/types';
import {Shape} from "konva/lib/Shape";
import {Node} from "./node";
import {Edge} from './edge';
import {ReingoldTilfordLayout} from './reingoldTilfordLayout';
import {Utils} from './utils';
import {NodeAddOptions, NodeToggleOptions} from './types';
import Stage = Konva.Stage;
import KonvaEventObject = Konva.KonvaEventObject;
import { Button } from './button';

const DEFAULT_ADD_BUTTON_ID = '__add_button';
const DEFAULT_ADD_BUTTON_IMAGE = '/public/assets/plus.svg';

const DEFAULT_TOGGLE_BUTTON_ID = '__toggle_button';

const TOGGLE_BUTTON_EXPAND_IMAGE = '/public/assets/expand.svg';
const TOGGLE_BUTTON_COLLAPSE_IMAGE = '/public/assets/collapse.svg';

export default class VisualTree {
    _container: HTMLElement;
    _stage: Konva.Stage;
    _layer: Konva.Layer;
    _layout = new ReingoldTilfordLayout();

    _nodeActionButton: Button;
    _nodeToggleButton: Button;
    _previousHitNode: Node;

    private _padding = 4.0;
    private _animation = true;
    private _keyboardNavigation = true;

    private _onMouseMove: (e: MouseEvent) => void;
    private _onClick: (e: MouseEvent) => void;
    private _onDblClick: (e: MouseEvent) => void;
    private _onAddButtonClick: (e: MouseEvent) => void;
    private _onToggleButtonClick: (e: MouseEvent) => void;
    private _onNodeSelected: (node: Node) => void;

    private _nodes: { [k: string]: Node } = {};
    private _nodesCount = 0;
    private _rootNode?: Node;
    private _edges: { [k: string]: Edge } = {};
    private _cells: Array<Array<Node>> = [];
    private _selectedNode: Node = null;
    private _initialRender = true;

    private _scale = 1.0;
    private _scaleFactor = 0.1;
    private _scaleMin = 0.0;
    private _scaleMax = 10.0;
    private _scaleWheelInverted = true;

    public _instance: VisualTree;

    constructor(
        public element: HTMLElement
    ) {
        this.initialize();
        this._instance = this;
    }

    private initialize() {
        const {element} = this;

        if (element == null || element.parentElement == null) {
            throw new Error("Invalid element");
        }

        const eId = element.id;
        const eParent = element.parentElement;

        this._container = eParent;
        this._layer = new Konva.Layer();
        this._stage = new Konva.Stage({
            container: eId,
            width: eParent.clientWidth,
            height: eParent.clientHeight,
            draggable: true
        });

        this._stage.add(this._layer);

        this.initializeButtons();
        this.attachListeners();
    }

    private initializeButtons() {
        const {_layer: layer} = this;

        const actionButton = new Button({
            id: DEFAULT_ADD_BUTTON_ID,
            icon: DEFAULT_ADD_BUTTON_IMAGE
        });

        const toggleButton = new Button({
            id: DEFAULT_TOGGLE_BUTTON_ID,
            icon: TOGGLE_BUTTON_COLLAPSE_IMAGE,
            size: {width: 18, height: 18},
            visible: true
        });

        toggleButton.setClickEvent((e) => {
            if (this._previousHitNode != null) {
                this.toggleNodeChildren(this._previousHitNode);
            }
        });

        actionButton.setClickEvent((e) => {
            if (this._onAddButtonClick != null) {
                this._onAddButtonClick(e);
            }
        });

        this._nodeActionButton = actionButton;
        this._nodeToggleButton = toggleButton;

        layer.add(actionButton.kNode);
        layer.add(toggleButton.kNode);
    }

    private setActionButtonState(options: NodeAddOptions = {}) {
        const {_nodeActionButton: actionButton} = this;
        const {node, visible, active} = options;

        actionButton.kNode.moveToTop();
        if (visible) {
            let nVector: Vector2d;
            let tX = actionButton.x;
            let tY = actionButton.y;

            if (node != null) {
                nVector = node.tailVector();
                tX = nVector.x;
                tY = nVector.y;
            }

            actionButton.kNode.setAttrs({
                visible: true,
                x: tX,
                y: tY
            });
        } else {
            actionButton.visible = false;
        }
    }

    private setToggleButtonState(options: NodeToggleOptions = {}) {
        const {
            _nodeToggleButton: toggle,
            _nodeActionButton: add
        } = this;
        const {node, visible, expanded} = options;

        toggle.kNode.moveToTop();
        if (visible) {
            let nVector: Vector2d;
            let tX = toggle.x;
            let tY = toggle.y;

            if (node != null) {
                nVector = node.tailVector();
                tX = nVector.x + add.width + 2;
                tY = nVector.y;
            }

            if (expanded) {
                toggle.icon = TOGGLE_BUTTON_EXPAND_IMAGE;
            } else {
                toggle.icon = TOGGLE_BUTTON_COLLAPSE_IMAGE;
            }

            toggle.kNode.setAttrs({
                visible: true,
                x: tX,
                y: tY
            });
        } else {
            toggle.visible = false;
        }
    }

    private attachListeners() {
        const {
            _stage: stage,
        } = this;

        stage.on('wheel', (e) => {
            e.evt.preventDefault();
            const {
                _stage,
                _scale,
                _scaleFactor,
                _scaleWheelInverted
            } = this;
            const distance = _scale * _scaleFactor * (_scaleWheelInverted ? -1 : 1);
            const scaleIn = _scale + distance;
            const scaleOut = _scale - distance;
            const nScale = e.evt.deltaY > 0 ? scaleIn : scaleOut;
            const position = _stage.getPointerPosition() || {x: 0, y: 0};

            this.scaleXY(nScale, position);
        });

        stage.on('mouseover', this.onMouseMove.bind(this));
        stage.on('click', this.onClick.bind(this));
        stage.on('dblclick', this.onDoubleClick.bind(this));

        window.addEventListener('resize', this.resize.bind(this));
        window.addEventListener('keyup', this.onKeyup.bind(this));
    }

    private onMouseMove(e: KonvaEventObject<MouseEvent>) {
        let node: Node;
        let hitBounds: IRect;
        const {_stage: stage, _scale } = this;
        const position = stage.getPointerPosition();

        const shape = e.target;

        const {
            _nodeActionButton: add,
            _nodeToggleButton: toggle
        } = this;

        if (shape) {
            node = this.getNodeFromShape(shape);
            if (node != null) {
                this._previousHitNode = node;
            }
        }

        if (this._previousHitNode != null) {
            node = this._previousHitNode;
            hitBounds = {
                x: node.bounds.x,
                y: node.bounds.y,
                width: node.bounds.width + (60 * _scale),
                height: node.bounds.height
            };
        }

        const isShapeIntersection = shape != null && (shape.id() === DEFAULT_ADD_BUTTON_ID || shape.id() === DEFAULT_TOGGLE_BUTTON_ID);
        const isHitBoundIntersection = hitBounds != null && Utils.pointInsideRect(position, hitBounds);

        if (!isShapeIntersection && !isHitBoundIntersection) {
            node = undefined;
        }

        this.setToggleButtonState({
            node: node,
            visible: node != null && node.children.length > 0,
            expanded: node != null && !node.expanded
        });

        if (this._onMouseMove != null) {
            e.evt['node'] = node;
            this._onMouseMove(e.evt);
        }
    }

    private onClick(e: KonvaEventObject<MouseEvent>) {
        const shape = e.target;

        if (shape) {
            const node = this.getNodeFromShape(shape);
            if (node != null) {
                this.selectNode(node.id);
            }
        }

        if (this._onClick != null) {
            this._onClick(e.evt);
        }
    }

    private onDoubleClick(e: KonvaEventObject<MouseEvent>) {
        if (this._onDblClick != null) {
            this._onDblClick(e.evt);
        }
    }

    private postKeyboardSelectionActions(engine: VisualTree, column: number, row: number) {
        const {cells} = engine;
        const nextNode = cells[column][row];
        engine.selectNode(nextNode.id);
        engine.panToNode(nextNode);
    }

    private onKeyup(e: KeyboardEvent) {
        const engine = this._instance;
        const {selectedNode: node, cells, keyboardNavigation} = engine;
        const key = e.key;

        if (node == null) {
            return;
        }

        if (keyboardNavigation && document.activeElement.nodeName === engine.container.nodeName) {
            let row = node.row;
            let column = node.column;

            switch (key) {
                case "ArrowLeft":
                    if (column > 0) {
                        if (node.parent != null) {
                            row = node.parent.row;
                        }

                        column -= 1;
                    }
                    this.postKeyboardSelectionActions(engine, column, row);
                    break;
                case "ArrowRight":
                    if (column < cells.length - 1) {
                        if (node.children.length > 0) {
                            const childIndex = Math.floor((node.children.length - 1) / 2);
                            row = node.children[childIndex].row;

                            column += 1;
                        }
                    }
                    this.postKeyboardSelectionActions(engine, column, row);
                    break;
                case "ArrowUp":
                    if (row > 0) {
                        row -= 1;
                    }
                    this.postKeyboardSelectionActions(engine, column, row);
                    break;
                case "ArrowDown":
                    if (row < cells[column].length - 1) {
                        row += 1;
                    }
                    this.postKeyboardSelectionActions(engine, column, row);
                    break;

            }
        }

        e.stopImmediatePropagation();
        e.preventDefault();
    }

    private getNodeFromShape(shape: Stage | Shape): Node {
        const {_nodes: nodes} = this;
        let el: Konva.Node = shape;

        while (el.parent != null && el.getAttr('tag') !== 'node') {
            el = el.parent;
        }

        return nodes[el.id()];
    }

    private insertNode(node: Node, parent?: Node, child?: Node) {
        const {_layer: layer, _nodes: nodes, _edges: edges} = this;

        if (parent != null) {
            // Add to parent children
            parent.add(node);
            // assign parent
            node.parent = parent;
            // Add edge
            const edge = new Edge(parent, node, {visible: false});
            layer.add(edge.kNode as Shape);
            edges[edge.id] = edge;
        }

        if (parent != null && child != null) {
            const edge = this.getEdgeBetweenNodesIds(parent.id, child.id);
            // Swap child parent to the new node
            // Remove from old parent first
            const childIndex = parent.children.indexOf(child);
            if (childIndex >= 0) {
                parent.children.splice(childIndex, 1);
            }

            // Add child to new parent
            node.add(child);
            child.parent = node;
            // Swap edge between new node as start and original end
            const edgeOldName = String(edge.id);
            edge.startNode = node;
            edge.isNew = true;
            delete edges[edgeOldName];
            edges[edge.id] = edge;
        }
    }

    private removeNode(node: Node, removeChildren = false) {
        const {_layer: layer, _nodes: nodes, _edges: edges} = this;
        const tNodes: Array<Node> = [node];

        if (node.parent == null) {
            return;
        }

        if (removeChildren) {
            while (tNodes.length > 0) {
                const node = tNodes.shift()!;
                tNodes.push(...node.children);

                const parent = node.parent;
                const childIndex = parent.children.indexOf(node);
                const edge = this.getEdgeBetweenNodes(node.parent, node);

                parent.children.splice(childIndex, 1);
                delete nodes[node.id];
                delete edges[edge.id];

                if (node.selected) {
                    this._selectedNode = null;
                }

                node.destroy();
                edge.destroy();
            }
        } else {
            if (node.children.length > 1) {
                throw new Error('Can not remove node with multiple children, Please use "removeChildren" parameter');
            }

            const { parent } = node;
            const childIndex = parent.children.indexOf(node);
            const edge = this.getEdgeBetweenNodes(node.parent, node);
            // Connect child to parent if available
            if (node.children.length === 1) {
                const child = node.children[0];
                const childEdge = this.getEdgeBetweenNodes(node, child);

                childEdge.startNode = parent;
                parent.children[childIndex] = child;
            } else {
                parent.children.splice(childIndex, 1);
            }

            delete nodes[node.id];
            delete edges[edge.id];

            if (node.selected) {
                this._selectedNode = null;
            }

            node.destroy();
            edge.destroy();
        }
    }

    public get container() {
        return this._container;
    }

    public get keyboardNavigation() {
        return this._keyboardNavigation;
    }

    private getEdgeBetweenNodes(start: Node, end: Node): Edge {
        if (start == null || end == null) {
            return null;
        }

        const edgeName = Edge.getEdgeNameFromNodes(start, end);
        return this._edges[edgeName];
    }

    private getEdgeBetweenNodesIds(startId: string, endId: string): Edge {
        const startNode = this._nodes[startId];
        const endNode = this._nodes[endId];
        return this.getEdgeBetweenNodes(startNode, endNode);
    }

    private getCenter(node: Konva.Node): Vector2d {
        return {x: node.width() / 2, y: node.height() / 2};
    }

    private getPanVector(viewport: IRect, node: Konva.Node): Vector2d {
        const tVector = {x: 0, y: 0};
        const {x, y, width, height} = node.getClientRect();

        // Check if node has complete intersection within view port
        if (Utils.hasFullIntersection(viewport, node.getClientRect())) {
            return tVector;
        }

        if (x < viewport.x) {
            tVector.x = Math.abs(x);
        }

        if (y < viewport.y) {
            tVector.y = Math.abs(y);
        }

        if (x + width > viewport.x + viewport.width) {
            tVector.x = (viewport.x + viewport.width) - (x + width);
        }

        if (y + height > viewport.y + viewport.height) {
            tVector.y = (viewport.y + viewport.height) - (y + height);
        }

        return tVector;
    }

    private downloadURI(uri, name) {
        const link = document.createElement('a');

        link.download = name;
        link.href = uri;

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        // delete link;
    }

    /**
     * Scale stage x & y to specific point or (0,0)
     * @param value Scale value
     * @param position Scale postion point
     * @returns void
     */
    private scaleXY(value: number, position?: Vector2d): void {
        const {_stage, _scaleMin, _scaleMax} = this;

        if (value <= _scaleMin || value >= _scaleMax) {
            return;
        }

        const center = this.getCenter(_stage);
        const oScale = _stage.scaleX();
        const sPosition = position || center;

        const mousePointTo = {
            x: (sPosition.x - _stage.x()) / oScale,
            y: (sPosition.y - _stage.y()) / oScale
        };

        _stage.scale({x: value, y: value});
        // Update current scale value
        this._scale = _stage.scaleX();

        const nPosition = {
            x: sPosition.x - mousePointTo.x * value,
            y: sPosition.y - mousePointTo.y * value
        };

        if (position != null) {
            _stage.position(nPosition);
        }

        _stage.batchDraw();
    }

    public get nodes() {
        return this._nodes;
    }

    public get cells() {
        return this._cells;
    }

    public panToNode(node: Node): void {
        const {_stage: stage, _animation: animation} = this;

        const stageContainer = stage.container();
        const viewport = {x: 0, y: 0, width: stageContainer.clientWidth, height: stageContainer.clientHeight};
        const panVector = this.getPanVector(viewport, node.kNode);

        if (panVector.x === 0 && panVector.y === 0) {
            return;
        }

        const pX = stage.x() + panVector.x;
        const pY = stage.y() + panVector.y;
        const duration = animation ? 0.8 : 0;

        new Konva.Tween({
            node: stage,
            duration: duration,
            x: pX,
            y: pY,
            easing: Konva.Easings.EaseInOut,
        }).play();
    }

    public toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    public selectNode(id: string): void {
        const node = this._nodes[id];

        if (node != null) {
            if (this._selectedNode != null) {
                this._selectedNode.selected = false;
            }

            node.selected = true;
            this._selectedNode = node;
            if(this._onNodeSelected != null) {
                this._onNodeSelected(node);
            }
        }
    }

    public get selectedNode(): Node {
        return this._selectedNode;
    }

    public resetSelection() {
        const {_nodes: nodes} = this;
        Object.values(nodes).forEach((node) => node.selected = false);
    }

    public selectPath(start: string, end: string): void {
        const startNode = this._nodes[start];
        const endNode = this._nodes[end];

        if (startNode == null || endNode == null) {
            return;
        }

        let node = endNode;
        while (node != null && node.id != start) {
            const edge = this.getEdgeBetweenNodes(node.parent, node);
            if (edge == null) {
                throw new Error(`No direct path between "${start}" and "${end}"`);
            }

            node.selected = true;
            edge.selected = true;
            node = node.parent;
        }
    }

    public resetPathsSelection() {
        const {_edges: edges} = this;
        Object.values(edges).forEach((edge) => {
            edge.startNode.selected = false;
            edge.selected = false;
        });
    }

    public highlightNodes(nodes: Array<Node> = []) {
        nodes.forEach((node) => node.highlighted = true);
    }

    public resetHighlight() {
        const {_nodes: nodes} = this;
        Object.values(nodes).forEach((node) => node.highlighted = false);
    }

    public toggleNodeChildren(parent: Node) {
        const {_nodeToggleButton: toggle} = this;
        const expanded = parent.expanded;
        const tree: Array<Node> = [...parent.children];

        while (tree.length > 0) {
            const node = tree.shift()!;
            tree.push(...node.children);

            const edge = this.getEdgeBetweenNodes(node.parent, node);

            if(!expanded) {
                node.expanded = true;
            }
            node.visible = !expanded;
            edge.visible = !expanded;
        }

        this.setToggleButtonState({
            expanded: expanded,
            visible: toggle.visible
        });
        parent.expanded = !expanded;
    }

    get isActionButtonVisible(): boolean {
        return this._nodeActionButton.visible;
    }

    public setActionButtonVisibility(visible: boolean, node?: Node) {
        this.setActionButtonState({
            visible,
            node: node
        });
    }

    get isToggleButtonVisible(): boolean {
        return this._nodeToggleButton.visible;
    }

    public setToggleButtonVisibility(visible: boolean, node?: Node) {
        this.setToggleButtonState({
            visible,
            node: node
        });
    }

    public resize() {
        const { _container: container } = this;
        if(container != null) {
            this._stage.size({ width: container.clientWidth, height: container.clientHeight });
        }
    }

    public setOnClickEvent(callback: (e: MouseEvent) => void) {
        this._onClick = callback;
    }

    public setOnDblClickEvent(callback: (e: MouseEvent) => void) {
        this._onDblClick = callback;
    }

    public setOnMouseMoveEvent(callback: (e: MouseEvent) => void) {
        this._onMouseMove = callback;
    }

    public setAddButtonOnClickEvent(callback: (e: MouseEvent) => void) {
        this._onAddButtonClick = callback;
    }

    public setOnNodeSelectedEvent(callback: (node: Node) => void) {
        this._onNodeSelected = callback;
    }

    public exportToImage(name: string, scale = 1) {
        const {_stage: stage, _layer: layer} = this;
        const background = new Konva.Rect({
            x: 0,
            y: 0,
            width: stage.width(),
            height: stage.height(),
            fill: 'white',
            listening: false,
        });

        layer.children.splice(0, 0, background);
        layer.draw();

        const dataURL = stage.toDataURL({pixelRatio: scale});
        this.downloadURI(dataURL, `${name}.png`);

        layer.children.splice(0, 1);
        layer.draw();
    }

    public zoomIn(): void {
        const {_scale, _scaleFactor} = this;
        // TODO - support animation
        this.scaleXY(_scale + _scale * _scaleFactor);
    }

    public zoomOut(): void {
        const {_scale, _scaleFactor} = this;
        // TODO - support animation
        this.scaleXY(_scale - _scale * _scaleFactor);
    }

    public zoomReset(): void {
        const scaleFactor = 1;
        this.zoomFit(scaleFactor);
    }

    zoomFit(scaleFactor?: number) {
        const {
            _stage: stage,
            _layer: layer,
            _scaleMax,
            _animation: animation,
            _padding
        } = this;

        let scale = scaleFactor ?? this._scale;
        const duration = animation ? 1 : 0;
        const lBounds = layer.getClientRect({ relativeTo: stage });
        const requireScale = lBounds.width * scale + _padding * 2 > stage.width() ||
                            lBounds.height * scale + _padding * 2 > stage.height();

        if(requireScale && scaleFactor == null){
            scale = Math.min(
                stage.width() / (lBounds.width + _padding * 2),
                stage.height() / (lBounds.height + _padding * 2)
            );
        }

        if(scale > _scaleMax) {
            scale = _scaleMax;
        }

        // Adjusted in center
        const cX = (stage.width() - lBounds.width * scale) / 2;
        const cY = (stage.height() - lBounds.height * scale) / 2;
        const sX = -lBounds.x * scale + _padding * scale + cX;
        const sY = -lBounds.y * scale  + _padding * scale + cY;

        new Konva.Tween({
            node: stage,
            duration: duration,
            x: sX,
            y: sY,
            scaleX: scale,
            scaleY: scale,
            easing: Konva.Easings.EaseInOut,
            onFinish: () => {
                this._scale = this._stage.scaleX();
            }
        }).play();
    }

    add(node: Node, parent?: Node | string, child?: Node | string): void {
        const {_layer: layer, _nodes: nodes} = this;

        const bChild = child instanceof Node ? child : nodes[child as string];
        const bParent = parent instanceof Node ? parent : nodes[parent as string];

        if (this._nodesCount > 0 && bParent == null) {
            throw new Error(`Invalid parent id, Please set valid parent for node "${node.id}" (Only one start node allowed, if you mean to make it as root)`);
        }

        if (this._rootNode == null) {
            this._rootNode = node;
        }

        this.insertNode(node, bParent, bChild);

        this._nodesCount++;
        nodes[node.id] = node;
        layer.add(node.kNode);
    }

    public remove(node: Node, removeChildren = false) {
        const {_layer: layer, _nodes: nodes} = this;

        if (node == null) {
            return;
        }

        this.removeNode(node, removeChildren);
    }

    render(onFinish?: () => void): void {
        const {_layout, _cells: cells, _rootNode} = this;

        const tweens = [];

        let maxLevelWidth = 0;
        const maxLevelHeight = 0;
        const nodes = [_rootNode];
        _layout.arrange(_rootNode as Node);
        const columnMarginFactor = 1.2;

        while (nodes.length > 0) {
            const node = nodes.shift()!;
            const parent = node.parent;

            for (let i = 0; i < node.children.length; i++) {
                if (node.children[i].width > maxLevelWidth) {
                    maxLevelWidth = node.children[i].width;
                }

                nodes.push(node.children[i]);
            }

            node.x = node.x * maxLevelWidth * columnMarginFactor;
            node.y = node.final;

            if (node.column >= cells.length) {
                cells.push([node]);
            } else {
                cells[node.column].push(node);
            }

            node.row = cells[node.column].length - 1;

            // Draw edge
            if (parent != null) {
                const edgeName = Edge.getEdgeNameFromNodes(parent, node);
                const edge = this._edges[edgeName];

                // Recalculate for adjusted start and end positions
                // edge.visible = true;

                edge.visible = true;
                edge.render();

                if (!this._initialRender && node.isNew) {
                    node.kNode.setAttrs({
                        position: {x: parent.x, y: parent.y}
                    });
                    tweens.push(new Konva.Tween({
                        node: node.kNode,
                        x: node.x,
                        y: node.y,
                        easing: Konva.Easings.EaseInOut,
                        duration: 1,
                        onUpdate: () => {
                            edge.render();
                        }
                    }));

                    edge.kNode.setAttrs({
                        opacity: 0.0
                    });

                    tweens.push(new Konva.Tween({
                        node: edge.kNode,
                        opacity: 1.0,
                        easing: Konva.Easings.EaseIn,
                        duration: 1.0,
                        onFinish: onFinish ? onFinish : null
                    }));
                }

                edge.isNew = false;
            }

            node.isNew = false;
            node.invalidate();
        }

        for (let i = 0; i < tweens.length; i++) {
            tweens[i].play();
        }

        this._initialRender = false;
    }
}
