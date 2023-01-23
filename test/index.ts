import Konva from 'konva';
import { Node } from '../src/node';
import VisualTree from '../src/index';

let root: Node;

const element = document.getElementById('tree-container');
const tree = new VisualTree(element);

const zoomIn = document.getElementById("zoom-in");
const zoomOut = document.getElementById("zoom-out");
const zoomFit = document.getElementById("zoom-fit");
const zoomReset = document.getElementById("zoom-reset");

const insertNode = document.getElementById("insert-node");
const addNode = document.getElementById("add-node");
const removeNode = document.getElementById("remove-node");
const removeNodeWithChildren = document.getElementById("remove-node-children");

const selectNode = document.getElementById("select-node");
const selectPanNode = document.getElementById("select-pan-node");
const selectPath = document.getElementById("select-path");

const resetPathsSelection = document.getElementById("reset-path-selection");
const resetSelection = document.getElementById("reset-selection");
const resetHighlighted = document.getElementById("reset-highlighted");

const fullscreen = document.getElementById("fullscreen");
const addTitle = document.getElementById("add-title");

const saveToImage = document.getElementById("save-to-image");
const saveToPdf = document.getElementById("save-to-pdf");

const searchInput = document.getElementById("search-input");
const collapseExpandToolbar = document.getElementById("collapse-expand");

zoomIn.onclick = (e) => {
    tree.zoomIn();
};
zoomOut.onclick = (e) => {
    tree.zoomOut();
};
zoomFit.onclick = (e) => {
    tree.zoomFit();
};
zoomReset.onclick = (e) => {
    tree.zoomReset();
};

fullscreen.onclick = (e) => {
    tree.toggleFullScreen();
};

addTitle.onclick = (e) => {
    const node = tree.selectedNode;

    if(node == null) {
        return;
    }

    node.title = "New Title\nOdio aptent amet sagittis mollis cubilia vulputate porta";
    tree.render();
};

let bCount = 1;

addNode.onclick = (e) => {
    const index = random(1, Object.keys(tree.nodes).length -1);
    let parent = Object.values(tree.nodes)[index];
    let child;

    if(tree.selectedNode != null) {
        parent = tree.selectedNode;
    }

    tree.add(new Node({
        id: `b${bCount++}`,
        name: `New Node - ${randomId()}`
    }), parent);

    tree.render();
};

insertNode.onclick = (e) => {
    const index = random(1, Object.keys(tree.nodes).length -1);
    let parent = Object.values(tree.nodes)[index];
    let child;

    if(tree.selectedNode != null) {
        parent = tree.selectedNode;
    }

    if(parent.children.length > 0) {
        const childIndex = random(0, parent.children.length - 1);
        child = parent.children[childIndex];
    }

    tree.add(new Node({
        id: `b${bCount++}`,
        name: `New Node - ${randomId()}`
    }), parent, child);

    tree.render();
};

removeNode.onclick = (e) => {
    const node = tree.selectedNode;

    if(node == null) {
        return;
    }

    tree.remove(node, false);
    tree.render();
};

removeNodeWithChildren.onclick = (e) => {
    const node = tree.selectedNode;

    if(node == null) {
        return;
    }

    tree.remove(node, true);
    tree.render();
};

selectNode.onclick = (e) => {
    const idx = random(0, Object.keys(tree.nodes).length - 1);
    const node = Object.values(tree.nodes)[idx];

    tree.selectNode(node.id);
};

selectPanNode.onclick = (e) => {
    const idx = random(0, Object.keys(tree.nodes).length - 1);
    const node = Object.values(tree.nodes)[idx];

    tree.selectNode(node.id);
    tree.panToNode(node);
};

selectPath.onclick = (e) => {
    const a = random(0, Object.keys(tree.nodes).length - 1);
    const b = random(0, Object.keys(tree.nodes).length - 1);

    let endNode = tree.selectedNode || Object.values(tree.nodes)[b];
    tree.selectPath(root.id, endNode.id);
};

resetPathsSelection.onclick = (e) => {
    tree.resetPathsSelection();
};

resetSelection.onclick = (e) => {
    tree.resetSelection();
};

resetHighlighted.onclick = (e) => {
    tree.resetHighlight();
};

saveToImage.onclick = (e) => {
    tree.exportToImage("tree", 5);
};

saveToPdf.onclick = (e) => {

};

searchInput.onkeyup = (e) => {
    const term = e.target['value'];

    if(term.length === 0) {
        return tree.resetHighlight();
    }

    Object.values(tree.nodes).forEach((node) => {
        if(node.name.indexOf(term) >= 0) {
            node.highlighted = true;
        } else {
            node.highlighted = false;
        }
    });
}

tree.setOnMouseMoveEvent((e) => {
   const node = e['node'];

   if(node != null) {
       tree.setActionButtonVisibility(true, node);
   } else {
       tree.setActionButtonVisibility(false);
   }
});

function random(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomId() {
    const n = random(2, 64);
    return Math.random().toString(36).substr(2, n);
}

root = new Node({
    id: "0",
    name: "Home",
    icon: '/public/assets/home.png',
    textColor: '#ffffff',
    backgroundColor: '#1e981e'
});
tree.add(root);

tree.setAddButtonOnClickEvent((e) => {
   console.log('Clicked');
});

tree.setOnNodeSelectedEvent((e) => {
    console.log(e.id);
});

const text = 'The quick brown fox jumps over a lazy dog 🔥 Odio aptent amet sagittis mollis cubilia vulputate porta  🚀 penatibus consequat lacus magnis quisque senectus tincidunt 🪁 porta porta purus in nunc Mauris suscipit laoreet morbi'.split(/\s/);
const maxNodes = 16;
let count = 1;
const recent: Array<Node> = [root];

for(let i=0; i < maxNodes; i++){
    const nodeIndex = random(0, recent.length);
    const titleLen = random(0, 24);
    const parent = recent[nodeIndex];
    const node = new Node({
        id: count.toString(),
        name: `Node ${randomId()}`
    });

    if(titleLen > 0) {
        node.title = text.slice(0, titleLen).join(' ');
    }

    if(i % 4 === 0) {
        // node.title = `N (${i+1}) 🚀`;
        // node.children.push(root);
    }

    recent.push(node);
    tree.add(node, parent);
    count++;
}

tree.render();
