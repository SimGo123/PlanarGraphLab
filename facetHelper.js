class StatusEdge {
    constructor(edge, rightVisited, leftVisited) {
        this.edge = edge;
        this.rightVisited = rightVisited;
        this.leftVisited = leftVisited;
    }
}

// Returns an array of facet walks
// Requires: graph is planar embedded, only one connected component
// TODO Handle one degree vertices
function getAllFacets(runGraph) {
    console.log("getAllFacets");
    // Copy edges into statusEdges, which keep additional left/right visited booleans
    let statusEdges = [];
    $.each(runGraph.edges, function (_index, edge) {
        // Status edges are [edge, rightVisited, leftVisited]
        statusEdges.push(new StatusEdge(edge, false, false));
    });
    let facets = [];
    $.each(runGraph.edges, function (_index, edge) {
        let statusEdge = statusEdges[statusEdgeIndex(statusEdges, edge)];
        if (!statusEdge.rightVisited) {
            // console.log('right facet');
            let rightFacet = facetWalk(edge, true, statusEdges, runGraph);
            facets.push(rightFacet);
            $.each(rightFacet, function (_index, edge) {
                let edgeIndex = statusEdgeIndex(statusEdges, edge);
                if (statusEdges[edgeIndex].edge.v1nr == edge.v1nr) {
                    statusEdges[edgeIndex].rightVisited = true;
                    // console.log("r");
                } else {
                    statusEdges[edgeIndex].leftVisited = true;
                    // console.log("l");
                }
            });
        }
        statusEdge = statusEdges[statusEdgeIndex(statusEdges, edge)];
        if (!statusEdge.leftVisited) {
            // console.log('left facet');
            let leftFacet = facetWalk(edge, false, statusEdges, runGraph);
            facets.push(leftFacet);
            $.each(leftFacet, function (_index, edge) {
                let edgeIndex = statusEdgeIndex(statusEdges, edge);
                if (statusEdges[edgeIndex].edge.v1nr == edge.v1nr) {
                    statusEdges[edgeIndex].leftVisited = true;
                    // console.log("l");
                } else {
                    statusEdges[edgeIndex].rightVisited = true;
                    // console.log("r");
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
        // console.log(facetStr);
    });
    return facets;
}

// Follow a facet from a vertex back to itself, return edges on facet
function facetWalk(edge, rightDir, statusEdges, runGraph) {
    let facet = [];
    let prevVertex = runGraph.getVertexByNumber(edge.v1nr);
    let currentVertex = runGraph.getVertexByNumber(edge.v2nr);
    let statusEdgeVisited = false;
    while (!statusEdgeVisited) {
        let neighbours = runGraph.getAllNeighbours(currentVertex);
        let nextVertex = nextVertexAfter(neighbours, prevVertex, rightDir);

        let newEdge = new Edge(currentVertex.number, nextVertex.number);
        let edgeIndex = statusEdgeIndex(statusEdges, newEdge);

        if (rightDir) {
            if (statusEdges[edgeIndex].edge.v1nr == newEdge.v1nr) {
                statusEdgeVisited = statusEdges[edgeIndex].rightVisited;
            } else {
                statusEdgeVisited = statusEdges[edgeIndex].leftVisited;
            }
        } else {
            if (statusEdges[edgeIndex].edge.v1nr == newEdge.v1nr) {
                statusEdgeVisited = statusEdges[edgeIndex].leftVisited;
            } else {
                statusEdgeVisited = statusEdges[edgeIndex].rightVisited;
            }
        }

        if (!statusEdgeVisited) {
            facet.push(newEdge);

            if (rightDir) {
                if (statusEdges[edgeIndex].edge.v1nr == newEdge.v1nr) {
                    statusEdges[edgeIndex].rightVisited = true;
                } else {
                    statusEdges[edgeIndex].leftVisited = true;
                }
            } else {
                if (statusEdges[edgeIndex].edge.v1nr == newEdge.v1nr) {
                    statusEdges[edgeIndex].leftVisited = true;
                } else {
                    statusEdges[edgeIndex].rightVisited = true;
                }
            }
        }

        prevVertex = currentVertex;
        currentVertex = nextVertex;
    }
    return facet;
}

function getUniqueVerticeNrsOnFacet(facet) {
    let verticesOnFacet = [];
    $.each(facet, function (_index, edge) {
        if (verticesOnFacet.indexOf(edge.v1nr) == -1) {
            verticesOnFacet.push(edge.v1nr);
        }
        if (verticesOnFacet.indexOf(edge.v2nr) == -1) {
            verticesOnFacet.push(edge.v2nr);
        }
    });
    return verticesOnFacet;
}

function getFacetCenter(facet, runGraph) {
    let facetCenter = new Point(0, 0);
    let verticesOnFacet = getUniqueVerticeNrsOnFacet(facet);
    $.each(verticesOnFacet, function (_index, vertexNr) {
        let vertex = runGraph.getVertexByNumber(vertexNr);
        facetCenter.x += vertex.x;
        facetCenter.y += vertex.y;
    });
    facetCenter.x /= verticesOnFacet.length;
    facetCenter.y /= verticesOnFacet.length;
    return facetCenter;
}

// Try to get the outer facet by checking which facet contains 
// the extreme (max/min x/y) vertices
// May return one, multiple (or no) facets that could be the outer facet
// Requires: Planar embedded graph
function tryGetOuterFacet(runGraph) {
    let extremeVertices = {
        'minX': runGraph.vertices[0], 'maxX': runGraph.vertices[0],
        'minY': runGraph.vertices[0], 'maxY': runGraph.vertices[0]
    };
    let minX = runGraph.vertices[0].x;
    let maxX = runGraph.vertices[0].x;
    let minY = runGraph.vertices[0].y;
    let maxY = runGraph.vertices[0].y;

    runGraph.vertices.forEach((vertex) => {
        if (vertex.x < minX) {
            minX = vertex.x;
            extremeVertices['minX'] = vertex;
        }
        if (vertex.x > maxX) {
            maxX = vertex.x;
            extremeVertices['maxX'] = vertex;
        }
        if (vertex.y < minY) {
            minY = vertex.y;
            extremeVertices['minY'] = vertex;
        }
        if (vertex.y > maxY) {
            maxY = vertex.y;
            extremeVertices['maxY'] = vertex;
        }
    });
    let facets = getAllFacets(runGraph);
    let possibilities = [];
    facets.forEach((facet) => {
        let verticeNrsOnFacet = getUniqueVerticeNrsOnFacet(facet);
        if (verticeNrsOnFacet.includes(extremeVertices['minX'].number)
            && verticeNrsOnFacet.includes(extremeVertices['maxX'].number)
            && verticeNrsOnFacet.includes(extremeVertices['minY'].number)
            && verticeNrsOnFacet.includes(extremeVertices['maxY'].number)) {
            possibilities.push(facet);
        }
    });
    // Check if both facets contain the same vertices (like inside and outside of circle graph)
    if (possibilities.length == 2
        && possibilities[0].sort().join(',') === possibilities[1].sort().join(',')) {
        return [possibilities[0]];
    }
    return possibilities;
}

// Get next vertex after afterVertex in right/left direction
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

function statusEdgeIndex(statusEdges, edge) {
    //console.log("looking for " + edge.print());
    for (var i = 0; i < statusEdges.length; i++) {
        //console.log("statusEdge " + statusEdges[i][0].v1.number + " " + statusEdges[i][0].v2.number);
        if (statusEdges[i].edge.eq(edge)) {
            //console.log("found se");
            return i;
        }
    }
    console.log("no se");
    return -1;
}