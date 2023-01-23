import {IRect} from "konva/lib/types";
import Konva from "konva";
import Vector2d = Konva.Vector2d;
import Rect = Konva.Rect;

export class Utils {
    static hasIntersection(a: IRect, b: IRect) {
        return !(
            b.x > a.x + a.width ||
            b.x + b.width < a.x ||
            b.y > a.y + a.height ||
            b.y + b.height < a.y
        );
    }

    static hasFullIntersection(a: IRect, b: IRect) {
        return (
            b.x >= a.x &&
            b.x + b.width <= a.x + a.width &&
            b.y >= a.y &&
            b.y + b.height <= a.y + a.height
        );
    }

    static pointInsideRect(a: Vector2d, b: IRect) {
        return (
            a.x > b.x &&
            a.x < b.x + b.width &&
            a.y > b.y &&
            a.y < b.y + b.height
        );
    }
  }
