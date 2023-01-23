import Konva from "konva";
import { Vector2d } from "konva/lib/types";
import { Node } from "./node";
import { Renderable, RenderMode } from "./types";

const DEFAULT_COLOR = 'gray';
const DEFAULT_SELECTION_COLOR = '#be2525';
const DEFAULT_VISIBILITY = true;
const DEFAULT_SELECTION_STATE = false;
const DEFAULT_ANIMATION = true;
const DEFAULT_RENDER_MODE = RenderMode.Normal;

export interface EdgeConfig {
    color?: string;
    selectionColor?: string;
    selected?: boolean;
    visible?: boolean;
    animation?: boolean;
    renderMode?: RenderMode
}

export class Edge implements Renderable {
    private readonly _node: Konva.Node;

    private _startNode: Node;
    private _endNode: Node;
    private _entities: Array<Konva.Node> = [];

    private _isNew = true;
    private _visible: boolean;
    private _selected: boolean;
    private _color: string;
    private _selectionColor = 'red';
    private _animation: boolean;
    private _renderMode = RenderMode.Debug;

    constructor(
        start: Node,
        end: Node,
        config: EdgeConfig = {}) {

        const { color, selectionColor, selected, visible, animation, renderMode} = config;

        this._startNode = start;
        this._endNode = end;
        this._color = color || DEFAULT_COLOR;
        this._selectionColor = selectionColor || DEFAULT_SELECTION_COLOR;
        this._visible = visible || DEFAULT_VISIBILITY;
        this._selected = selected || DEFAULT_SELECTION_STATE;
        this._animation = animation || DEFAULT_ANIMATION;
        this._renderMode = renderMode || DEFAULT_RENDER_MODE;

        this._node = new Konva.Line({
            id: Edge.getEdgeNameFromNodes(start, end),
            tension: 0.5,
        });

        this.invalidate()
    }

    static getEdgeNameFromNodes(start: Node, end: Node): string {
        return `${start.id}-${end.id}`;
    }

    private invalidate() {
        const {
            _color: color,
            _selectionColor: selectionColor,
            _selected: selected,
            _animation: animation,
            _visible: visible
        } = this;

        const options = {
            strokeWidth: 1,
            stroke: color,
            shadowBlur: 0,
            shadowColor: '#be2525',
            visible: visible
        };

        if(selected) {
            options.strokeWidth = 3;
            options.stroke = selectionColor;
            options.shadowBlur = 3;
        }

        if(animation && !this._isNew) {
            this._node.setAttrs({
                opacity: 0.4,
            });

            new Konva.Tween({
                node: this._node,
                duration: 1,
                opacity: 1,
                easing: Konva.Easings.EaseInOut,
            }).play();
        }

        this._node.setAttrs(options);
    }

    private updateEdgeId() {
        const {_startNode: start, _endNode: end} = this;
        const edgeName = Edge.getEdgeNameFromNodes(start, end);
        this._node.setAttrs({
            id: edgeName
        });
    }

    get id() {
        return this._node.id();
    }

    get visible() {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
        this._node.setAttrs({visible: value});
    }

    public get isNew() {
        return this._isNew;
    }

    public set isNew(value) {
        this._isNew = value;
    }

    get selected(): boolean {
        return this._selected;
    }

    set selected(value: boolean) {
        this._selected = value;
        this.invalidate();
    }

    set position(position: Vector2d) {
        this._node.setAttrs({position});
    }

    set startNode(node: Node) {
        this._startNode = node;
        this.updateEdgeId();
    }

    get startNode() {
        return this._startNode;
    }

    set endNode(node: Node) {
        this._endNode = node;
        this.updateEdgeId();
    }

    get endNode() {
        return this._endNode;
    }

    get kNode() {
        return this._node;
    }

    destroy() {
        this._node.remove();
    }

    render(): void {
        const { _startNode: start, _endNode: end, _visible: visible } = this;

        const p1 = start.tailVector();
        const p2 = end.headPoint();

        const xMin = Math.min(p1.x, p2.x);
        const xMax = Math.max(p1.x, p2.x);
        const yMin = Math.min(p1.y, p2.y);
        const yMax = Math.max(p1.y, p2.y);
        // cartesian y location
        // up = positive half, down = negative half
        // x will always be in positive half
        const cY1f = p1.y - p2.y >= 0 ? -1 : 1;
        const cY1p = p1.y - p2.y >= 0 ? yMax : yMin;

        const t1X = xMin + (xMax - xMin) * 0.22;
        const t1Y = cY1p + (yMax - yMin) * cY1f * 0.1;
        const pt1 = { x: t1X, y: t1Y };

        // eslint-disable-next-line no-unused-vars
        const cY2f = p1.y - p2.y >= 0 ? 1 : -1;
        const cY2p = p1.y - p2.y >= 0 ? yMin : yMax;

        const t2X = xMin + (xMax - xMin) * 0.85;
        const t2Y = cY2p + (yMax - yMin) * cY1f * -0.1;
        const pt2 = { x: t2X, y: t2Y };

        // const edgeName = Edge.getEdgeNameFromBlocks(start, end);
        const points = [p1.x, p1.y, pt1.x, pt1.y, pt2.x, pt2.y, p2.x, p2.y];

        this._node.setAttrs({
            points,
            visible
        });
    }
}
