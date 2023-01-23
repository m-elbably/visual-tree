import Konva from 'konva';
import {IRect, Vector2d} from 'konva/lib/types';
import {NodeOptions, Renderable} from './types';

const DEFAULT_TEXT_COLOR = 'black';
const DEFAULT_BACKGROUND_COLOR = 'white';

const DEFAULT_MARGIN = 6;
const DEFAULT_PADDING = 12;

const DEFAULT_ICON_SIZE = 24;

// TODO - control selection and highlight colors
export class Node implements Renderable {
    private readonly _id: string;
    private _name: string;
    private _title: string;
    private _icon: string;
    private _textColor: string;
    private _backgroundColor: string;
    private _selected: boolean;
    private _highlighted: boolean;

    private _parent: Node;
    private _children: Array<Node>;

    private _isNew = true;
    private _visible = true;
    private _expanded = true;

    private _x = 0;
    private _y = 0;
    private _margin = 0;
    private _padding = 0;
    private _hitBounds: IRect;
    private _lastWidth = 0;

    column = 0;
    row = 0;

    level = 0;
    modifier = 0;
    final = 0;
    prevSibling?: Node;

    private _node: Konva.Group = new Konva.Group();
    private _contents: any = {};

    constructor(private _options: NodeOptions) {
        const {id, name, title, icon, textColor, backgroundColor, selected, highlighted, parent} = _options;

        this._id = id;
        this._name = name ?? '';
        this._title = title ?? '';
        this._icon = icon ?? null;
        this._textColor = textColor ?? DEFAULT_TEXT_COLOR;
        this._backgroundColor = backgroundColor ?? DEFAULT_BACKGROUND_COLOR;
        this._selected = selected ?? false;
        this._highlighted = highlighted ?? false;
        this._parent = parent ?? null;
        this._children = [];

        this._margin = DEFAULT_MARGIN;
        this._padding = DEFAULT_PADDING;
        this._hitBounds = {x: 0, y: 0, width: 0, height: 0};

        this.initialize();
        this.invalidate();
    }

    initialize(): void {
        const {
            _id: id,
            _node: node,
            _contents: contents
        } = this;

        node.setAttrs({id, tag: 'node'});

        contents.title = new Konva.Text();
        contents.body = new Konva.Group();
        contents.background = new Konva.Rect();
        contents.icon = new Konva.Image({image: new Image()});
        contents.name = new Konva.Text();
        contents.selection = new Konva.Rect();

        // Add elements to body group
        contents.body.add(
            contents.background,
            contents.icon,
            contents.name,
            contents.selection
        );

        node.add(contents.title, contents.body);
    }

    invalidate(): void {
        const {
            _name: name,
            _title: title,
            _icon: icon,
            _textColor: textColor,
            _backgroundColor: backgroundColor,
            _selected: selected,
            _highlighted: highlighted,
            _padding: padding,
            _margin: margin,
            _contents: contents
        } = this;

        const {
            title: eTitle,
            name: eName,
            icon: eIcon,
            background: eBackground,
            selection: eSelection
        } = contents;
        let tX = 0;

        eTitle.setAttrs({
            text: title,
            fontSize: 14,
            fill: 'gray',
            align: 'center',
            fontStyle: 'bold',
            verticalAlign: 'middle',
            wrap: 'word',
            transformsEnabled: 'position',
            listening: false
        });

        if (icon != null) {
            const iconImage = new Image();
            iconImage.src = icon;
            iconImage.crossOrigin = 'Anonymous';
            eIcon.setAttrs({
                x: padding,
                image: iconImage,
                width: DEFAULT_ICON_SIZE,
                height: DEFAULT_ICON_SIZE,
                listening: false,
                transformsEnabled: 'position'
            });

            tX = eIcon.x() + eIcon.width() + (margin / 2);
        }

        eName.setAttrs({
            x: tX,
            text: name,
            fontSize: 16,
            fill: textColor,
            align: 'left',
            padding: padding,
            verticalAlign: 'middle',
            listening: false,
            transformsEnabled: 'position'
        });

        eBackground.setAttrs({
            shadowBlur: 2,
            fill: backgroundColor,
            transformsEnabled: 'none'
        });

        eSelection.setAttrs({
            strokeWidth: 3,
            shadowBlur: 2,
            shadowColor: '#a61616',
            stroke: '#cc2e2e',
            visible: selected,
            listening: false,
            transformsEnabled: 'none'
        });

        if (highlighted) {
            eBackground.setAttrs({
                fill: 'rgba(49,151,238,0.2)'
            });
        }

        this.postInvalidation();
    }

    postInvalidation() {
        const {
            _x: x, _y: y,
            _margin: margin,
            _node: node,
            _contents: contents
        } = this;

        const {
            name: eName,
            title: eTitle,
            icon: eIcon,
            background: eBackground,
            selection: eSelection,
            body: eBody
        } = contents;
        // Get client rect after all elements added and adjusted
        let {width, height} = this.getShapeRect(eBody);

        let nWidth = width;
        let nHeight = height;
        let cWidth = width;
        let cHeight = height;
        let titleHeight = 0;

        const nMaxWidth = (eName.x() + eName.width() + (margin * 2)) * 1.1;
        nWidth = Math.max(nWidth, nMaxWidth);
        cWidth = nWidth;

        eTitle.width(nWidth);
        if(this._title.length > 0) {
            titleHeight = eTitle.height() + margin;
        }

        eName.y(cHeight / 2 - (eName.height() - 2) / 2);
        if (eIcon != null) {
            eIcon.y(cHeight / 2 - eIcon.height() / 2);
        }

        eBackground.setAttrs({
            cornerRadius: cWidth / 1.8,
            size: {width: cWidth, height: cHeight}
        });

        eSelection.setAttrs({
            cornerRadius: cHeight / 1.9,
            size: {width: cWidth, height: cHeight}
        });

        // Adjust content group
        let {width: eBodyWidth, height: eBodyHeight} = this.getShapeRect(eBody);
        eBody.y(titleHeight);
        eBody.setSize({width: eBodyWidth, height: eBodyHeight})

        // Finally, set group node attributes
        nHeight = eBody.y() + eBodyHeight;
        node.setSize({width: nWidth, height: nHeight});
        node.setAttrs({
            position: {x, y}
        });
    }

    getShapeRect(shape: Konva.Shape): IRect {
        return shape.getClientRect({
            skipTransform: true,
            skipShadow: true,
            skipStroke: true
        });
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
        this.invalidate();
    }

    get title(): string {
        return this._title;
    }

    set title(value: string) {
        this._title = value;
        this.invalidate();
    }

    get icon(): string {
        return this._icon;
    }

    set icon(value: string) {
        this._icon = value;
    }

    get textColor(): string {
        return this._textColor;
    }

    set textColor(value: string) {
        this._textColor = value;
        this.invalidate();
    }

    get backgroundColor(): string {
        return this._backgroundColor;
    }

    set backgroundColor(value: string) {
        this._backgroundColor = value;
        this.invalidate();
    }

    get selected(): boolean {
        return this._selected;
    }

    set selected(value: boolean) {
        this._selected = value;
        this.invalidate();
    }

    get highlighted(): boolean {
        return this._highlighted;
    }

    set highlighted(value: boolean) {
        this._highlighted = value;
        this.invalidate();
    }

    get parent(): Node {
        return this._parent;
    }

    set parent(value: Node) {
        this._parent = value;
    }

    get children(): Array<Node> {
        return this._children;
    }

    set children(value: Array<Node>) {
        this._children = value;
    }

    get isNew(): boolean {
        return this._isNew;
    }

    set isNew(value: boolean) {
        this._isNew = value;
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
        this._node.setAttr('visible', value);
    }

    get expanded(): boolean {
        return this._expanded;
    }

    set expanded(value: boolean) {
        this._expanded = value;
    }

    get x(): number {
        return this._x;
    }

    set x(value: number) {
        this._x = value;
        this._node.x(value);
    }

    get y(): number {
        return this._y;
    }

    set y(value: number) {
        this._y = value;
        this._node.y(value);
    }

    get width() {
        return this._node.width();
    }

    get height() {
        return this._node.height();
    }

    get bounds() {
        const {_node: node} = this;
        return node.getClientRect();
    }

    get kNode() {
        return this._node;
    }

    destroy() {
        this._node.remove();
    }

    add(node: Node): void {
        this._children.push(node);
    }

    headPoint(): Vector2d {
        const {_node: node, _contents: contents} = this;
        const { body } = contents;

        return {
            x: node.x(),
            y: node.y() + body.y() + (body.height() /2)
        };
    }

    tailVector(): Vector2d {
        const {_node: node, _contents: contents} = this;
        const { body } = contents;

        return {
            x: node.x() + node.width(),
            y: node.y() + body.y() + (body.height() /2)
        };
    }

    visit(func: (arg: any) => void) {
        func(this);
        for (let i = 0; i < this._children.length; i++) {
            this._children[i].visit(func);
        }
    }
}
