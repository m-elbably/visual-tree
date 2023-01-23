import Konva from "konva";
import {Vector2d} from "konva/lib/types";
import {Renderable, RenderMode, Size} from "./types";

const DEFAULT_SIZE = {width: 24, height: 24};
const DEFAULT_PADDING =4;
const DEFAULT_COLOR = '#d5d5d5';
const DEFAULT_SELECTION_COLOR = '#bdbdbd';
const DEFAULT_VISIBILITY = true;
const DEFAULT_ANIMATION = true;

export interface ButtonConfig {
    id?: string;
    icon?: string;
    size?: Size;
    padding?: number;
    color?: string;
    selectionColor?: string;
    visible?: boolean;
    animation?: boolean;
}

export class Button implements Renderable {
    private readonly _node: Konva.Group;
    private _entities: { [k: string]: any } = {};

    private _id: string;
    private readonly _size: Size;
    private _padding: number;
    private _icon: string;
    private _visible: boolean;
    private _color: string;
    private _selectionColor = 'red';
    private _animation: boolean;

    private _onClickEvent: (e: MouseEvent) => void;

    constructor(config: ButtonConfig = {}) {

        const {id, icon, size, padding, color, selectionColor, visible, animation} = config;

        this._id = id;
        this._icon = icon;
        this._size = size || DEFAULT_SIZE;
        this._padding = padding || DEFAULT_PADDING;
        this._color = color || DEFAULT_COLOR;
        this._selectionColor = selectionColor || DEFAULT_SELECTION_COLOR;
        this._visible = visible || DEFAULT_VISIBILITY;
        this._animation = animation || DEFAULT_ANIMATION;

        const { width, height } = this._size;
        this._node = new Konva.Group({
            visible: false,
            width: width,
            height: height
        });

        this.initialize();
        this.invalidate()
    }

    private initialize() {
        const {
            _entities: entities,
            _node: node
        } = this;

        const imageIcon = new Image();
        const image = new Konva.Image({
            image: imageIcon,
            listening: false,
        });
        const background = new Konva.Circle({
            listening: true
        });

        entities.imageIcon = imageIcon;
        entities.image = image;
        entities.background = background;

        node.add(background, image);
        node.on('mousedown', this.onMouseDown.bind(this));
        node.on('mouseup', this.onMouseUp.bind(this));
        node.on('mouseleave', this.onMouseUp.bind(this));
        node.on('click', this.onClick.bind(this));
    }

    private invalidate() {
        const {
            _id: id,
            _size: size,
            _padding: padding,
            _icon: icon,
            _color: color,
            _selectionColor: selectedColor,
            _entities: entities,
            _node: node
        } = this;

        const {width, height} = size;
        const {imageIcon, image, background} = entities;

        imageIcon.src = icon;
        image.setAttrs({
            x: - (width - padding) / 2,
            y: - (height - padding) / 2,
            width: width - padding,
            height: height - padding,
        });
        background.setAttrs({
            id,
            width,
            height,
            fill: 'white',
            stroke: color,
            strokeWidth: 1,
            shadowBlur: 1,
            shadowColor: 'black',
        });

        node.draw();
    }

    private onMouseDown() {
        const { _entities: entities, _selectionColor: selectionColor } = this;

        const {background} = entities;
        background.setAttrs({
            stroke: selectionColor,
            shadowBlur: 2,
        });
    }

    private onMouseUp() {
        const { _entities: entities, _color: color } = this;

        const {background} = entities;
        background.setAttrs({
            stroke: color,
            shadowBlur: 1,
        });
    }

    private onClick(e) {
        if(this._onClickEvent != null) {
            this._onClickEvent(e);
        }
    }

    get id() {
        return this._node.id();
    }

    get visible() {
        return this._node.visible();
    }

    set visible(value: boolean) {
        this._node.setAttrs({visible: value});
    }

    set position(position: Vector2d) {
        this._node.setAttrs({position});
    }

    get icon(): string {
        return this._icon;
    }

    set icon(value: string) {
        this._icon = value;
        this.invalidate();
    }

    setClickEvent(callback: (e: MouseEvent) => void) {
        this._onClickEvent = callback;
    }

    get x() {
        return this.kNode.x();
    }

    get y() {
        return this.kNode.y();
    }

    get width() {
        return this._node.width();
    }

    get height() {
        return this._node.height();
    }

    get kNode() {
        return this._node;
    }
}
