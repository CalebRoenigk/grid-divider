let gridManager;
let xCountSlider = document.getElementById("x-cell-count");
let yCountSlider = document.getElementById("y-cell-count");
let resolutionSlider = document.getElementById("cell-subdivisions");
let clearButton = document.getElementById("clear-lines");
let showLines = document.getElementById("show-lines");
let undoButton = document.getElementById("undo-line");
let backgroundColor;
let strokeThickness = 2;

function setup() {
    var canvasSize = getCanvasSize();
    var canvas = createCanvas(canvasSize.w, canvasSize.h);
    canvas.parent("canvas-parent");
    backgroundColor = color('#F4D738');
    gridManager = new GridManager(4, 5, 6);

    xCountSlider.oninput = function() {
        forceCellUpdate();
    };

    yCountSlider.oninput = function() {
        forceCellUpdate();
    };
    
    resolutionSlider.oninput = function() {
        forceCellUpdate();
    };

    clearButton.onclick = function() {
        clearLines();
    };

    showLines.onchange = function() {
        showLinesToggle();
    };
    showLines.checked = true;

    undoButton.onclick = function() {
        gridManager.undoLine();
    };
}

function showTips() {
    var elements = document.querySelectorAll('.tip-box');
    // Convert the NodeList to an array
    let tips = Array.from(elements);
    tips.forEach(function (t) {
        t.style.opacity = 100;
        t.style.transform = "translateY(-110%)";
    })
}

function hideTips() {
    var elements = document.querySelectorAll('.tip-box');
    // Convert the NodeList to an array
    let tips = Array.from(elements);
    tips.forEach(function (t) {
        t.style.opacity = 0;
        t.style.transform = "translateY(-95%)";
    })
}

function draw() {
    background(backgroundColor);
    gridManager.update();
}

function windowResized() {
    var canvasSize = getCanvasSize();
    resizeCanvas(canvasSize.w, canvasSize.h);
    forceCellUpdate();
}

function mouseClicked() {
    if(mouseX >=0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        gridManager.addPoint(createVector(mouseX, mouseY), keyIsDown(16)); // When shift is down, make this a continued line
    }
}

function clearLines() {
    gridManager.lines = [];
    forceCellUpdate();
}

function showLinesToggle() {
    if(gridManager.showLines !== showLines.checked) {
        gridManager.showLines = showLines.checked;
        forceCellUpdate();
    }
}

function forceCellUpdate() {
    gridManager.needUpdate = true;
}

function getCanvasSize() {
    return {w: document.body.clientWidth-32, h: document.body.clientHeight-(32+180)};
}

class Line {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }

    draw() {
        noFill();
        stroke(color("black"));
        strokeWeight(5);

        point(this.start.x, this.start.y);
        point(this.end.x, this.end.y);
        line(this.start.x, this.start.y, this.end.x, this.end.y);
        
        noFill();
        stroke(color("FF7A5C"));
        strokeWeight(3);

        point(this.start.x, this.start.y);
        point(this.end.x, this.end.y);
        line(this.start.x, this.start.y, this.end.x, this.end.y);
    }

    lineIntersects(line) {
        // calculate the direction of the lines
        let uA = ((line.end.x-line.start.x)*(this.start.y-line.start.y) - (line.end.y-line.start.y)*(this.start.x-line.start.x)) / ((line.end.y-line.start.y)*(this.end.x-this.start.x) - (line.end.x-line.start.x)*(this.end.y-this.start.y));
        let uB = ((this.end.x-this.start.x)*(this.start.y-line.start.y) - (this.end.y-this.start.y)*(this.start.x-line.start.x)) / ((line.end.y-line.start.y)*(this.end.x-this.start.x) - (line.end.x-line.start.x)*(this.end.y-this.start.y));

        // if uA and uB are between 0-1, lines are colliding
        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {

//       // optionally, draw a circle where the lines meet
//       float intersectionX = x1 + (uA * (x2-x1));
//       float intersectionY = y1 + (uA * (y2-y1));
//       fill(255,0,0);
//       noStroke();
//       ellipse(intersectionX, intersectionY, 20, 20);

            return true;
        }

        return false;
    }
}

class Cell {
    constructor(center, size, index, divisionLevel, gutter) {
        this.center = center;
        this.size = size;
        this.sides = this.getSides();
        this.isIntersected = false;
        this.index = index;
        this.divisionLevel = divisionLevel;
        this.gutter = gutter;
    }

    getSides() {
        let left = new Line(createVector(this.center.x-this.size/2, this.center.y - this.size/2), createVector(this.center.x-this.size/2, this.center.y + this.size/2));
        let right = new Line(createVector(this.center.x+this.size/2, this.center.y - this.size/2), createVector(this.center.x+this.size/2, this.center.y + this.size/2));
        let top = new Line(createVector(this.center.x-this.size/2, this.center.y - this.size/2), createVector(this.center.x+this.size/2, this.center.y - this.size/2));
        let bottom = new Line(createVector(this.center.x-this.size/2, this.center.y + this.size/2), createVector(this.center.x+this.size/2, this.center.y + this.size/2));

        return [left, top, right, bottom];
    }

    lineIntersects(line) {
        // Test for lines who are entirely held within the cell
        if(this.pointWithinCell(line.start) && this.pointWithinCell(line.end)) {
            this.isIntersected = true;
            return true;
        }

        this.sides.forEach(s => {
            if(s.lineIntersects(line)) {
                this.isIntersected = true;
                return true;
            }
        });

        return false;
    }

    pointWithinCell(point) {
        let min = createVector(-this.size/2, -this.size/2).add(this.center);
        let max = createVector(this.size/2, this.size/2).add(this.center);

        if((point.x >= min.x && point.x <= max.x) && (point.y >= min.y && point.y <= max.y)) {
            return true;
        }

        return false;
    }

    canSubdivide() {
        let dividedCellSize = this.size/2;
        let cellSizeAfterGutter = dividedCellSize - (this.gutter*2);
        if(cellSizeAfterGutter < this.gutter) {
            return false;
        }
        return true;
    }

    subdivideCell() {
        let dividedCellSize = this.size/2;
        let indexScale = 1/pow(2, this.divisionLevel);
        let divisionLevel = this.divisionLevel+1;
        let topLeft = new Cell(createVector(-dividedCellSize/2, -dividedCellSize/2).add(this.center), dividedCellSize, this.index, divisionLevel, this.gutter);
        let topRight = new Cell(createVector(dividedCellSize/2, -dividedCellSize/2).add(this.center), dividedCellSize, createVector(indexScale, 0).add(this.index), divisionLevel, this.gutter);
        let bottomLeft = new Cell(createVector(-dividedCellSize/2, dividedCellSize/2).add(this.center), dividedCellSize, createVector(0, indexScale).add(this.index), divisionLevel, this.gutter);
        let bottomRight = new Cell(createVector(dividedCellSize/2, dividedCellSize/2).add(this.center), dividedCellSize, createVector(indexScale, indexScale).add(this.index), divisionLevel, this.gutter);

        return [topLeft, topRight, bottomLeft, bottomRight];
    }
    
    drawCell() {
        fill(backgroundColor);
        stroke(color('black'));
        strokeWeight(strokeThickness);

        rectMode(CENTER);
        rect(this.center.x, this.center.y, this.size-(this.gutter*2));
    }

    drawShadow() {
        fill(color('black'));
        stroke(color('black'));
        strokeWeight(strokeThickness);

        rectMode(CENTER);
        for(let i=1; i < 5; i++) {
            rect(this.center.x+i, this.center.y+i, this.size-(this.gutter*2));
        }
    }
}

class GridManager {
    constructor(cellCountX, maxDivisions, gutter) {
        this.lines = [];
        this.clicks = 0;
        this.startLine = createVector(0,0);
        this.endLine = createVector(0,0);
        this.xDivisions = 1;
        this.yDivisions = 1;
        this.subdivisions = 1;
        this.cellMax = 0;
        this.cells = this.generateCells(cellCountX);
        this.showLines = true;
        this.gutter = gutter;
        this.needUpdate = true;
    }

    update() {
        if(this.needUpdate) {
            this.xDivisions = xCountSlider.value;
            this.yDivisions = yCountSlider.value;
            this.subdivisions = resolutionSlider.value;
            
            this.cells = this.generateCells();
            if(this.lines.length > 0) {
                this.generateDivisions();
            }

            this.checkIntersections();
            this.needUpdate = false;
        }

        this.draw();
    }

    draw() {
        this.drawCells();
        if(this.showLines) {
            this.drawLines();
        }
    }

    drawLines() {
        noFill();
        stroke(color('red'));
        strokeWeight(1);
        this.lines.forEach(l => l.draw());

        this.drawLineCurrent();
    }

    drawLineCurrent() {
        if(this.clicks > 0) {
            line(this.startLine.x, this.startLine.y, mouseX, mouseY);
        }

        // noFill();
        // stroke(color('magenta'));
        // strokeWeight(8);
        //
        // point(mouseX, mouseY);
    }

    drawCells() {
        this.cells.forEach(col => {
            col.forEach(c => c.drawShadow());
        });
        this.cells.forEach(col => {
            col.forEach(c => c.drawCell());
        });
    }

    addPoint(point, isShiftDown) {
        if(this.clicks == 0) {
            this.startLine = point;
        }
        if(this.clicks == 1) {
            this.endLine = point;
            if(isShiftDown) {
                this.clicks = 0;
                this.lines.push(new Line(this.startLine, this.endLine));
                this.startLine = point;
                this.needUpdate = true;
            }
        }

        this.clicks++;

        if(this.clicks >= 2) {
            this.clicks = 0;
            this.lines.push(new Line(this.startLine, this.endLine));
            this.needUpdate = true;
        }
    }

    checkIntersections() {
        this.cells.forEach(col => {
            col.forEach(c => {
                this.lines.forEach(l => c.lineIntersects(l));
            });
        });
    }

    generateCells(cellCountX) {
        // Find the width of the cells based on the smallest width
        let cellXSize = width/this.xDivisions;
        let cellYSize = height/this.yDivisions;
        let cellSize = min(cellXSize, cellYSize);
        this.cellMax = cellSize;
        
        // Determine the bound size of the cell grid
        let xWidth = this.cellMax * this.xDivisions;
        let yHeight = this.cellMax * this.yDivisions;
        let centerBounds = createVector(xWidth/2, yHeight/2);
        let centerCanvas = createVector(width/2, height/2);
        let offsetCells = centerCanvas.sub(centerBounds);

        let cells = [];
        for(let x=0; x < this.xDivisions; x++) {
            let cellColumn = [];
            for(let y=0; y < this.yDivisions; y++) {
                let cellCenter = createVector(cellSize/2, cellSize/2).add(cellSize*x, cellSize*y).add(offsetCells);
                cellColumn.push(new Cell(cellCenter, cellSize, createVector(x, y), 1, this.gutter));
            }
            cells.push(cellColumn);
        }

        return cells;
    }

    generateDivisions() {
        for(let i=0; i < this.subdivisions; i++) {
            // console.log("doing a division step: " + i);
            this.cells = this.divideCells(this.cells);
            this.checkIntersections();
        }
    }

    divideCells(cells) {
        let newCells = [];
        // if(this.lines.length > 0) {
        //   console.log("division input:");
        //   console.log(cells);
        // }
        if(this.lines.length <= 0) {
            newCells = cells;
            return newCells;
        }

        cells.forEach(col => {
            let newCol = [];
            col.forEach(c => {
                // console.log("Checking for need to subdivide cell at: [" + [c.index.x, c.index.y].join(', ') + "]");
                // console.log("this cell is intersected: " + c.isIntersected);

                if(c.isIntersected) {
                    // Check if the cell can even be subdivided
                    if(c.canSubdivide()) {
                        let subdividedCells = c.subdivideCell();
                        subdividedCells.forEach(subCell => newCol.push(subCell));
                    } else {
                        newCol.push(c);
                    }
                } else {
                    newCol.push(c);
                }
            })

            newCells.push(newCol);
        })

        return newCells;
    }

    undoLine() {
        if(this.lines.length > 0) {
            this.lines.pop();
            this.needUpdate = true;
        }
    }
}