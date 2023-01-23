import Konva from "konva";
import { Node } from "./node";

export interface Size {
    width: number;
    height: number;
}

export enum RenderMode {
    Normal,
    Debug
};

export interface NodeOptions {
    id: string;
    name?: string;
    title?: string;
    icon?: string;
    textColor?: string;
    backgroundColor?: string;
    selected?: boolean;
    highlighted?: boolean;
    parent?: Node;
}

export interface NodeToggleOptions {
    node?: Node;
    expanded?: boolean;
    visible?: boolean;
}

export interface NodeAddOptions {
    node?: Node;
    active?: boolean;
    visible?: boolean;
}

export interface Renderable {
    kNode: Konva.Node;
}
