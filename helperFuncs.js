function getNextDegOneVertex() {
    console.log("deg1");
    for (var i = 0; i < graph.vertices.length; i++) {
        var vertex = graph.vertices[i];
        if (graph.getVertexDegree(vertex) == 1) {
            console.log("found deg1 vertex");
            return vertex;
        }
    }
    console.log("no deg1 vertices");
    return null;
}

function nextVertexAfter(vertices, afterVertex, rightDir) {
    let vertexIndex = eqIndexOf(vertices, afterVertex);
    if (rightDir) {
        if (vertexIndex == vertices.length - 1) {
            return vertices[0];
        } else {
            return vertices[vertexIndex + 1];
        }
    } else {
        if (vertexIndex == 0) {
            return vertices[vertices.length - 1];
        } else {
            return vertices[vertexIndex - 1];
        }
    }
}

function depthFirstSearch(vertex) {
    console.log("depthFirstSearch");
    let visited = [];
    let stack = [];
    stack.push(vertex);
    while (stack.length > 0) {
        let vertex = stack.pop();
        if (eqIndexOf(visited, vertex) == -1) {
            visited.push(vertex);
            let neighbours = graph.getAllNeighbours(vertex);
            $.each(neighbours, function (_index, neighbour) {
                stack.push(neighbour);
            });
        }
    }
    return visited;
}

class BreadthSearchVertex {
    constructor(vertex, parent) {
        this.vertex = vertex;
        this.parent = parent;
    }

    eq(other) {
        return this.vertex.eq(other.vertex);
    }
}

function breadthFirstSearchTree(vertex) {
    console.log("breadthFirstSearchTree");
    let visited = [vertex];
    let layers = [];
    let prevLayer = [new BreadthSearchVertex(vertex, null)];
    while (prevLayer.length > 0) {
        let nextLayer = [];
        layers.push(prevLayer);
        $.each(prevLayer, function (_index, prevLayerBSVertex) {
            let neighbours = graph.getAllNeighbours(prevLayerBSVertex.vertex);
            console.log('neighbours: ' + neighbours.length);
            $.each(neighbours, function (_index, neighbourVertex) {
                if (eqIndexOf(visited, neighbourVertex) == -1) {
                    visited.push(neighbourVertex);
                    nextLayer.push(new BreadthSearchVertex(neighbourVertex, prevLayerBSVertex.vertex));
                }
            });
        });
        prevLayer = nextLayer;
    }
    return layers;
}

// Returns an array of facet walks
// Requires: graph is planar embedded, only one connected component
// TODO Handle one degree vertices
function getAllFacets() {
    console.log("getAllFacets");
    // Copy edges into statusEdges, which keep additional left/right visited booleans
    let statusEdges = [];
    $.each(graph.edges, function (_index, edge) {
        // Status edges are [edge, rightVisited, leftVisited]
        statusEdges.push([edge, false, false]);
    });
    let facets = [];
    $.each(graph.edges, function (_index, edge) {
        let statusEdge = statusEdges[statusEdgeIndex(statusEdges, edge)];
        if (!statusEdge[1]) {
            console.log('right facet');
            let rightFacet = facetWalk(edge, true, statusEdges);
            facets.push(rightFacet);
            $.each(rightFacet, function (_index, edge) {
                let edgeIndex = statusEdgeIndex(statusEdges, edge);
                if (statusEdges[edgeIndex][0].v1 == edge.v1) {
                    statusEdges[edgeIndex][1] = true;
                    console.log("r");
                } else {
                    statusEdges[edgeIndex][2] = true;
                    console.log("l");
                }
            });
        }
        statusEdge = statusEdges[statusEdgeIndex(statusEdges, edge)];
        if (!statusEdge[2]) {
            console.log('left facet');
            let leftFacet = facetWalk(edge, false, statusEdges);
            facets.push(leftFacet);
            $.each(leftFacet, function (_index, edge) {
                let edgeIndex = statusEdgeIndex(statusEdges, edge);
                if (statusEdges[edgeIndex][0].v1 == edge.v1) {
                    statusEdges[edgeIndex][2] = true;
                    console.log("l");
                } else {
                    statusEdges[edgeIndex][1] = true;
                    console.log("r");
                }
            });
        }
    });
    console.log("Found " + facets.length + " facets");
    $.each(facets, function (_index, facet) {
        let facetStr = "";
        $.each(facet, function (_index, edge) {
            facetStr += edge.print() + " ";
        });
        console.log(facetStr);
    });
    return facets;
}

// Follow a facet from a vertex back to itself, return edges on facet
function facetWalk(edge, rightDir, statusEdges) {
    let facet = [];
    let prevVertex = edge.v1;
    let currentVertex = edge.v2;
    let statusEdgeVisited = false;
    while (!statusEdgeVisited) {
        let neighbours = graph.getAllNeighbours(currentVertex);
        let nextVertex = nextVertexAfter(neighbours, prevVertex, rightDir);

        let newEdge = new Edge(currentVertex, nextVertex);
        let edgeIndex = statusEdgeIndex(statusEdges, newEdge);

        let sameDirIndex = rightDir ? 1 : 2;
        let oppDirIndex = rightDir ? 2 : 1;
        if (statusEdges[edgeIndex][0].v1 == newEdge.v1) {
            statusEdgeVisited = statusEdges[edgeIndex][sameDirIndex];
        } else {
            statusEdgeVisited = statusEdges[edgeIndex][oppDirIndex];
        }

        if (!statusEdgeVisited) {
            facet.push(newEdge);

            if (statusEdges[edgeIndex][0].v1 == newEdge.v1) {
                statusEdges[edgeIndex][sameDirIndex] = true;
            } else {
                statusEdges[edgeIndex][oppDirIndex] = true;
            }
        }

        prevVertex = currentVertex;
        currentVertex = nextVertex;
    }
    return facet;
}

function getUniqueVerticesOnFacet(facet) {
    let verticesOnFacet = [];
    $.each(facet, function (_index, edge) {
        if (eqIndexOf(verticesOnFacet, edge.v1) == -1) {
            verticesOnFacet.push(edge.v1);
        }
        if (eqIndexOf(verticesOnFacet, edge.v2) == -1) {
            verticesOnFacet.push(edge.v2);
        }
    });
    return verticesOnFacet;
}

function eqIndexOf(array, element, withId = false) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].eq(element, withId)) {
            return i;
        }
    }
    //console.log("eq index not found");
    return -1;
}

function statusEdgeIndex(statusEdges, edge) {
    //console.log("looking for " + edge.print());
    for (var i = 0; i < statusEdges.length; i++) {
        //console.log("statusEdge " + statusEdges[i][0].v1.number + " " + statusEdges[i][0].v2.number);
        if (statusEdges[i][0].eq(edge)) {
            //console.log("found se");
            return i;
        }
    }
    console.log("no se");
    return -1;
}

function safeArrEqDel(arr, elem, withId = false) {
    let index = eqIndexOf(arr, elem, withId);
    if (index > -1) {
        arr.splice(index, 1);
    }
}

function sortClockwise(vertex, vertices) {
    return vertices.sort(function (x, y) {
        if (getAngle(vertex, x) < getAngle(vertex, y)) {
            return -1;
        }
        if (getAngle(vertex, x) > getAngle(vertex, y)) {
            return 1;
        }
        return 0;
    });
}

// Get the angle in degrees between 0 o'clock from the vertex and the vertex's neighbor
function getAngle(vertex, neighbour) {
    var dAx = 0;
    var dAy = -1;
    var dBx = neighbour.x - vertex.x;
    var dBy = neighbour.y - vertex.y;
    var angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);

    var degree_angle = Math.abs(angle * (180 / Math.PI));
    if (angle < 0) degree_angle = 360 - Math.abs(degree_angle);

    return degree_angle;
}

function changeVectorLength(vector, length) {
    let vectorLength = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return new Point(vector.x * length / vectorLength, vector.y * length / vectorLength);
}