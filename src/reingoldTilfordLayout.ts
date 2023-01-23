import { Node } from "./node";

/**
 * Edward M. Reingold, And John S. Tilford Tree Visualization Algorithm
 */
export class ReingoldTilfordLayout {
    constructor(
        public margin: number = 24
    ) { }

    arrange(root: Node) {
        if(root == null) {
            return;
        }

        this.initialize(root, 0, null);
        this.firstPass(root);
        this.secondPass(root, 0);
        this.fixNodeConflicts(root);
        this.shiftTreeIntoFrame(root);
    }

    private initialize(node: Node, level: number, prevSibling: Node) {
        node.x = level;
        node.column = level;
        node.prevSibling = prevSibling;

        for (let i = 0; i < node.children.length; i++) {
            this.initialize(
                node.children[i],
                level + 1,
                i >= 1 ? node.children[i - 1] : null
            );
        }
    }

    firstPass(node: Node): void {
        for (let i = 0; i < node.children.length; i++) {
            this.firstPass(node.children[i]);
        }

        if (node.prevSibling) {
            node.y = node.prevSibling.y + this.margin;
        } else {
            node.y = 0;
        }

        if (node.children.length === 1) {
            node.modifier = node.y;
        } else if (node.children.length >= 2) {
            let minY = Infinity;
            let maxY = -minY;
            for (let i = 0; i < node.children.length; i++) {
                minY = Math.min(minY, node.children[i].y);
                maxY = Math.max(maxY, node.children[i].y);
            }
            node.modifier = node.y - (maxY - minY) / 2;
        }
    }

    secondPass(node: Node, modSum: number): void {
        node.final = node.y + modSum;
        for (let i = 0; i < node.children.length; i++) {
            this.secondPass(node.children[i], node.modifier + modSum);
        }
    }

    fixNodeConflicts(node: Node): void {
        for (let i = 0; i < node.children.length; i++) {
            this.fixNodeConflicts(node.children[i]);
        }

        for (let i = 0; i < node.children.length - 1; i++) {
            let botContour = -Infinity;
            node.children[i].visit(
                (node) => (botContour = Math.max(botContour, node.final + node.height))
            );

            let topContour = Infinity;
            node.children[i + 1].visit(
                (node) => (topContour = Math.min(topContour, node.final))
            );

            if (botContour >= topContour) {
                node.children[i + 1].visit(
                    node => (node.final += botContour - topContour + this.margin)
                );
            }
        }
    }

    shiftTreeIntoFrame(root: Node): void {
        let minY = Infinity;
        root.visit(node => {
            minY = Math.min(minY, node.final);
        });

        root.visit(node => {
            node.final += Math.abs(minY);
        });
    }
}
