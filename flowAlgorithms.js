class MaxFlowAlgo extends Algorithm {

    preconditionsCheck() {
        let fulfilled = true;
        if (!graph.isPlanarEmbedded()) {
            alert("graph is not planar embedded!");
            fulfilled = false;
        }
        $.each(graph.edges, function (_index, edge) {
            if (edge.weight == null) {
                alert("can't calculate max flow, " + edge.print() + " has no weight!");
                fulfilled = false;
                return false;
            }
        });
        if (graph.source == -1 || graph.target == -1) {
            alert("can't calculate max flow, source or target not set!");
            fulfilled = false;
        }
        return fulfilled;
    }

    async run() {
        super.numSteps = "X";

        if (!this.preconditionsCheck()) {
            super.onFinished();
            return;
        }

        await super.pause("Check if S and T are on same facet", "Check if the source and the target are on the same facet. That would reduce complexity from O(nlogn) to O(n)");

        let facets = getAllFacets(graph);
        let onSameFacet = false;
        facets.forEach((facet) => {
            let verticeNumbers = getUniqueVerticeNrsOnFacet(facet);
            if (verticeNumbers.includes(graph.source) && verticeNumbers.includes(graph.target)) {
                onSameFacet = true;
            }
        });

        let outerFacetPoss = tryGetOuterFacet(graph);
        let onOuterFacet = outerFacetPoss.length == 1
            && getUniqueVerticeNrsOnFacet(outerFacetPoss[0]).includes(graph.source)
            && getUniqueVerticeNrsOnFacet(outerFacetPoss[0]).includes(graph.target);
        let result = -1;
        if (onSameFacet && onOuterFacet) {
            super.numSteps = 7;
            await super.pause("S and T are on the same facet", "Furthermore, they are both on the outer facet. So the fast approach can be used.");
            result = await this.fastApproach(outerFacetPoss[0]);
        } else if (onSameFacet) {
            await super.pause("S and T are on the same facet, but...", "... they are not on the outer facet. Normally, the fast method is used, but instead, we use the slow method.");
            result = await this.slowApproach();
        } else {
            await super.pause("S and T are not on the same facet", "This means that there is no faster approach then the O(nlogn) one.");
            result = await this.slowApproach();
        }

        super.onFinished();
        return result;
    }

    async fastApproach(outerFacet) {
        await super.pause("Construct dual graph", "");
        let copyGraph = graph.getCopy();
        let [dualGraph, edgeEqualities, vertexFacets] = graph.getDualGraph();
        graph = dualGraph;
        this.drawTwoGraphs(copyGraph, graph);

        await super.pause("Split outer facet", "Split it into two parts, as if an edge were inserted in outer facet between S and T");
        let edgesToNewFacet = [];
        for (let i = 0; i < outerFacet.length; i++) {
            let edge = outerFacet[i];
            if (edgesToNewFacet.length == 0 && (edge.v1nr == copyGraph.source || edge.v1nr == copyGraph.target)) {
                edgesToNewFacet.push(edge);
            } else if (edgesToNewFacet.length > 0) {
                edgesToNewFacet.push(edge);
            }
            if (edgesToNewFacet.length != 0 && (edge.v2nr == copyGraph.source || edge.v2nr == copyGraph.target)) {
                break;
            }
        }
        let oldFacetVertexNr = -1;
        vertexFacets.forEach(vf => {
            if (getUniqueVerticeNrsOnFacet(vf.facet).join(',') == getUniqueVerticeNrsOnFacet(outerFacet).join(',')) {
                oldFacetVertexNr = vf.vertexNumber;
            }
        });
        let newFacetVertex = new Vertex(100, 100);
        graph.addVertex(newFacetVertex);
        for (let i = 0; i < edgesToNewFacet.length; i++) {
            for (let j = 0; j < edgeEqualities.length; j++) {
                if (edgesToNewFacet[i].eq(edgeEqualities[j].edge2)) {
                    let dualId = eqIndexOf(graph.edges, edgeEqualities[j].edge1, false, true);
                    if (graph.edges[dualId].v1nr == oldFacetVertexNr) {
                        graph.edges[dualId].v1nr = newFacetVertex.number;
                    } else if (graph.edges[dualId].v2nr == oldFacetVertexNr) {
                        graph.edges[dualId].v2nr = newFacetVertex.number;
                    }
                }
            }
        }
        this.drawTwoGraphs(copyGraph, graph);

        await super.pause("Calculate shortest distance between the new facet node and every other node",
            "Calculate distance from the new facet vertex " + newFacetVertex.number + " to every other vertex using Dijekstra.");
        let distances = getDijekstraResults(newFacetVertex);
        graph = copyGraph;
        this.drawTwoGraphs(dualGraph, graph);

        // Combine each facet with its dual vertex.
        // Facets can be identical, but have to be mapped to different vertices
        let facets = getAllFacets(graph);
        let verticesForFacets = [];
        let visited = [];
        for (let i = 0; i < facets.length; i++) {
            let facet = facets[i];
            let vn = -1;
            for (let j = 0; j < vertexFacets.length; j++) {
                if (!visited.includes(j)) {
                    let vertFac = vertexFacets[j];
                    if (getUniqueVerticeNrsOnFacet(facet).join(',') == getUniqueVerticeNrsOnFacet(vertFac.facet).join(',')) {
                        visited.push(j);
                        vn = vertFac.vertexNumber;
                        break;
                    }
                }
            }
            verticesForFacets.push(vn);
        }

        facets.forEach((facet, i) => {
            let facetVertex = dualGraph.getVertexByNumber(verticesForFacets[i]);
            let dist = distances[eqIndexOf(dualGraph.vertices, facetVertex)];
            let facetCenter = getFacetCenter(facet, graph);
            var ctx = fgCanvas.getContext("2d");
            ctx.fillStyle = "green";
            ctx.fillText(dist, facetCenter.x, facetCenter.y);
        });

        await super.pause("Set flow for each edge",
            "Set flow as the difference between the distances of the right and left facet from the new facet vertex "
            + newFacetVertex.number
            + ". If the flow is negative, the direction of the edge is reversed and the flow is set to the absolute value.");
        graph.edges.forEach(e => {
            for (var i = 0; i < facets.length; i++) {
                let facet = facets[i];
                if (eqIndexOf(facet, e) != -1) {
                    for (var j = i + 1; j < facets.length; j++) {
                        let facet2 = facets[j];
                        if (eqIndexOf(facet2, e) != -1) {
                            let facetVertex1 = dualGraph.getVertexByNumber(verticesForFacets[i]);
                            let facetVertex2 = dualGraph.getVertexByNumber(verticesForFacets[j]);
                            if (eqIndexOf(edgesToNewFacet, e) != -1) {
                                if (facetVertex1.number == oldFacetVertexNr && eqIndexOf(edgesToNewFacet, e) != -1) {
                                    facetVertex1 = newFacetVertex;
                                }
                                if (facetVertex2.number == oldFacetVertexNr && eqIndexOf(edgesToNewFacet, e) != -1) {
                                    facetVertex2 = newFacetVertex;
                                }
                            }
                            let dist1 = distances[eqIndexOf(dualGraph.vertices, facetVertex1)];
                            let dist2 = distances[eqIndexOf(dualGraph.vertices, facetVertex2)];
                            let oldWeight = e.weight;
                            e.weight = (dist1 - dist2) + "/" + oldWeight;
                            if (dist1 > dist2) {
                                e.orientation = "N";
                            } else if (dist1 < dist2) {
                                e.orientation = "R";
                                e.weight = (-dist1 - -dist2) + "/" + oldWeight;
                            }
                            break;
                        }
                    }
                }
            }
        });
        redrawAll();

        let maxFlow = distances[dualGraph.getVertexIdByNumber(oldFacetVertexNr)];
        await super.pause("Result", "Max flow is " + maxFlow);
        return maxFlow;
    }

    // TODO implement
    async slowApproach() {
        await super.pause("Find path between S and T", "Find a path between S and T using Breadth-First Search.");
        let bfsTree = breadthFirstSearchTree(graph.getVertexByNumber(graph.source), graph);
        let verticesInPath = [graph.getVertexByNumber(graph.target)];
        let edgesInPath = [];
        for (let i = bfsTree.length - 1; i > 0; i--) {
            let layer = bfsTree[i];
            let layerIndex = -1;
            for (let j = 0; j < layer.length; j++) {
                let bsVertex = layer[j];
                if (bsVertex.vertex.eq(verticesInPath[0])) {
                    layerIndex = j;
                    break;
                }
            }
            if (layerIndex != -1) {
                edgesInPath.unshift(graph.getEdgeByStartEnd(layer[layerIndex].parent.number, layer[layerIndex].vertex.number));
                verticesInPath.unshift(layer[layerIndex].parent);
            }
        }
        if (verticesInPath.length != edgesInPath.length + 1) {
            console.error("verticesInPath.length != edgesInPath.length + 1");
            return;
        }

        // Set orientation of edge.
        // Can't be combined with next loop because this update is needed in copyGraph
        for (let i = 0; i < edgesInPath.length; i++) {
            let edge = edgesInPath[i];
            let v1 = verticesInPath[i];
            if (edge.v1nr == v1.number) {
                edge.orientation = "N";
            } else {
                edge.orientation = "R";
            }
        }

        // Copy the graph that doesn't contain the reverse edges to dualize it
        let singleOrientGraph = graph.getCopy();

        let colorSet = new ColorSet();
        let directedEdgesInPath = [];
        let dirEdgesInRevPath = [];
        for (let i = 0; i < edgesInPath.length; i++) {
            let edge = new Edge(edgesInPath[i].v1nr, edgesInPath[i].v2nr, null, edgesInPath[i].weight, EdgeOrientation.NORMAL);
            let revEdge = new Edge(edge.v1nr, edge.v2nr, null, edge.weight, EdgeOrientation.REVERSED);
            let v1 = verticesInPath[i];
            if (edge.v1nr == v1.number) {
                directedEdgesInPath.push(edge);
                dirEdgesInRevPath.push(revEdge);
            } else {
                directedEdgesInPath.push(revEdge);
                dirEdgesInRevPath.push(edge);
            }
            if (edgesInPath[i].orientation == EdgeOrientation.NORMAL) {
                graph.addEdge(revEdge);
            } else if (edgesInPath[i].orientation == EdgeOrientation.REVERSED) {
                graph.addEdge(edge);
            }
        }
        directedEdgesInPath.forEach(e => colorSet.addEdgeColor(e, "green"));
        dirEdgesInRevPath.forEach(e => colorSet.addEdgeColor(e, "orange"));
        redrawAll(colorSet);

        let revOrientGraph = graph.getCopy();

        await super.pause("Construct dual graph", "");
        let [dualGraph, edgeEqualities, vertexFacets] = singleOrientGraph.getDualGraph();
        graph = dualGraph;
        let foreColorSet = new ColorSet();
        let backColorSet = new ColorSet("#D3D3D3", "#D3D3D3", "red");
        let pathEdges = [];
        let revPathEdges = [];
        edgeEqualities.forEach(ee => {
            if (eqIndexOf(edgesInPath, ee.edge2) != -1) {
                foreColorSet.addEdgeColor(ee.edge1, "green");
                backColorSet.addEdgeColor(ee.edge2, "#90EE90");
                let revEdge = new Edge(ee.edge1.v1nr, ee.edge1.v2nr, null, ee.edge1.weight,
                    reverseOrientation(ee.edge1.orientation));
                graph.addEdge(revEdge);
                foreColorSet.addEdgeColor(revEdge, "orange");
                revPathEdges.push(revEdge);
                pathEdges.push(ee.edge1);
            }
        });
        dirEdgesInRevPath.forEach(e => backColorSet.addEdgeColor(e, "#FFD580"));
        this.drawTwoGraphs(revOrientGraph, graph, backColorSet, foreColorSet);

        await super.pause("Find maximal alpha so that there are no negative cycles",
            "Decrement edges on s-t-path by alpha and increment edges on reverse s-t-path till there are negative cycles. "
            + "Use Bellman-Ford to check for negative cycles.");
        let alpha;
        for (alpha = 0; alpha < 20; alpha++) {
            if (containsNegativeCycles(graph, graph.vertices[0])) {
                alpha--;
                break;
            }
            for (let i = 0; i < pathEdges.length; i++) {
                let edge = pathEdges[i];
                let revEdge = revPathEdges[i];
                edge.weight = parseInt(edge.weight) - 1;
                revEdge.weight = parseInt(revEdge.weight) + 1;
            }
            redrawAll(foreColorSet);
            await super.pause("alpha = " + alpha, "");
        }
        await super.pause("Result", "Max flow is " + alpha);
        return alpha;
    }

    drawTwoGraphs(backGraph, foreGraph,
        backColorSet = new ColorSet("#D3D3D3", "#D3D3D3", "red"), foreColorSet = new ColorSet()) {
        clearFgCanvas();
        drawCanvasWalls();
        backGraph.draw(null, null, backColorSet);
        foreGraph.draw(selectedVertex, selectedEdge, foreColorSet);
    }
}

class DisjunctSTPathsAlgo extends Algorithm {

    preconditionsCheck() {
        let fulfilled = true;
        if (!graph.isPlanarEmbedded()) {
            alert("graph is not planar embedded!");
            fulfilled = false;
        }
        if (graph.source == -1 || graph.target == -1) {
            alert("can't calculate disjunct s-t-paths, source or target not set!");
            fulfilled = false;
        }
        return fulfilled;
    }

    async run() {
        super.numSteps = "X";

        if (!this.preconditionsCheck()) {
            super.onFinished();
            return;
        }

        await super.pause("Check if T is on outer facet", "Check if the target is on the outer facet. That would - for us - reduce complexity from O(nlogn) to O(n)");

        let outerFacetPoss = tryGetOuterFacet(graph);
        let onOuterFacet = outerFacetPoss.length == 1
            && getUniqueVerticeNrsOnFacet(outerFacetPoss[0]).includes(graph.target);
        if (onOuterFacet) {
            super.numSteps = 9;
            await super.pause("T is on the outer facet", "The fast O(n) approach can be used.");
            await this.fastApproach(outerFacetPoss[0]);
        } else {
            super.numSteps = 5;
            await super.pause("T is not on the outer facet", "The slow O(nlogn) approach has to be used because making any facet an outer facet isn't implemented.");
            await this.slowApproach();
        }

        super.onFinished();
    }

    async fastApproach(outerFacet) {
        await super.pause("Orient every edge in the graph", "Replace undirected edges with directed edges");
        let unorientedGraph = graph.getCopy();
        graph.replaceUnorientedEdges();
        redrawAll();

        await super.pause("Eliminate clockwise circles (I)", "First, dualize the graph");
        let [dualGraph, edgeEqualities, vertexFacets] = unorientedGraph.getDualGraph();
        graph = dualGraph;
        graph.replaceUnorientedEdges();
        redrawAll();

        await super.pause("Eliminate clockwise circles (II)", "Second, create a BFS-tree starting at the outer facet vertex");
        let outerFacetVertexNr = -1;
        vertexFacets.forEach(vf => {
            if (getUniqueVerticeNrsOnFacet(vf.facet).join(',') == getUniqueVerticeNrsOnFacet(outerFacet).join(',')) {
                outerFacetVertexNr = vf.vertexNumber;
            }
        });
        let layers = breadthFirstSearchTree(graph.getVertexByNumber(outerFacetVertexNr), graph);
        this.drawLayerStructure(layers);

        await super.pause("Eliminate clockwise circles (III)", "Look at each layer, and reverse all edges going to the next lower layer");
        // Look at each layer except the last one
        for (let i = 0; i < layers.length - 1; i++) {
            // At each vertex in that layer
            layers[i].forEach(currLayerVertex => {
                let currLayerVertexNr = currLayerVertex.vertex.number;
                // At each vertex in the next layer
                layers[i + 1].forEach(nextLayerVertex => {
                    let nextLayerVertexNr = nextLayerVertex.vertex.number;
                    graph.edges.forEach(edge => {
                        if (edge.v1nr == currLayerVertexNr && edge.v2nr == nextLayerVertexNr
                            && edge.orientation == EdgeOrientation.NORMAL) {
                            edge.orientation = EdgeOrientation.REVERSED;
                        } else if (edge.v1nr == nextLayerVertexNr && edge.v2nr == currLayerVertexNr
                            && edge.orientation == EdgeOrientation.REVERSED) {
                            edge.orientation = EdgeOrientation.NORMAL;
                        }
                    });
                });
            });
        }
        redrawAll();

        await super.pause("Convert back by using dualization again", "The resulting graph does not contain any clockwise circles anymore");
        let dualizedD2 = graph.getCopy();
        graph = unorientedGraph;
        graph.edges = [];
        let indexes = [];
        // Dualized D2 (DD2) is oriented, but the edge equalities are not.
        // Un-dualize DD2 by matching up DD2's edges with the edges in the edge equalities.
        // ee1 contains dualized vertex numbers, ee2 contains original vertex numbers
        for (let i = 0; i < dualizedD2.edges.length; i++) {
            let dd2e = dualizedD2.edges[i];
            edgeEqualities.forEach((ee, idx) => {
                if (indexes.filter(x => x == idx).length < 2) {
                    let ee1 = ee.edge1;
                    let ee2 = ee.edge2;
                    if (ee1.v1nr == dd2e.v1nr && ee1.v2nr == dd2e.v2nr && ee1.weight == dd2e.weight) {
                        let newEdge = new Edge(ee2.v1nr, ee2.v2nr, dd2e.id, dd2e.weight, dd2e.orientation);
                        graph.addEdge(newEdge);
                        indexes.push(idx);
                    } else if (ee1.v1nr == dd2e.v2nr && ee1.v2nr == dd2e.v1nr && ee1.weight == dd2e.weight) {
                        let newEdge = new Edge(ee2.v2nr, ee2.v1nr, dd2e.id, dd2e.weight, dd2e.orientation);
                        graph.addEdge(newEdge);
                        indexes.push(idx);
                    }
                }
            });
        }
        redrawAll();

        await super.pause("Find paths by using right-depth-first search", "Start at the source, always take the rightmost unvisited edge. If the target is reached, a path was found.");
        let paths = this.rightDepthFirstSearch(graph.getVertexByNumber(graph.source));

        let colors = ["green", "orange", "blue", "purple", "yellow", "pink"];
        let colorSet = new ColorSet();
        paths.forEach((path, i) => {
            path.forEach(edge => {
                colorSet.addEdgeColor(edge, colors[i % colors.length]);
            });
        });
        redrawAll(colorSet);
        await super.pause("Result", "There are " + paths.length + " disjunct s-t-paths");
    }

    async slowApproach() {
        await super.pause("Set all edge capacities to 1", "");
        graph.edges.forEach(e => e.weight = 1);
        let copyOneGraph = graph.getCopy();
        redrawAll();

        await super.pause("Calculate max flow", "The result is the number of disjunct s-t-paths");
        let maxFlowAlgo = new MaxFlowAlgo();
        maxFlowAlgo.shouldContinue = true;
        maxFlowAlgo.runComplete = true;
        maxFlowAlgo.isSubAlgo = true;
        let maxFlow = await maxFlowAlgo.run();
        graph = copyOneGraph;
        redrawAll();
        await super.pause("Result", "Max flow is " + maxFlow + ", so there are " + maxFlow + " disjunct s-t-paths");
    }

    drawLayerStructure(layers) {
        let minPoint = new Point(fgCanvas.width / 3, fgCanvas.height / 4);
        let width = fgCanvas.width / 2;
        let height = fgCanvas.height * (3 / 4);
        let layerHeight = height / layers.length;
        $.each(layers, function (layerIndex, layer) {
            $.each(layer, function (bsVertexIndex, bsVertex) {
                let vertexIndex = eqIndexOf(graph.vertices, bsVertex.vertex);
                graph.vertices[vertexIndex].x = minPoint.x + width / (layer.length + 1) * (bsVertexIndex + 1);
                graph.vertices[vertexIndex].y = minPoint.y + layerHeight * layerIndex;
            });
        });
        redrawAll();
    }

    rightDepthFirstSearch(startVertex) {
        console.log("rightDepthFirstSearch");
        graph.indexAllEdges();
        let visited = [];
        let incidentEdges = graph.getIncidentEdges(startVertex, true);
        let result = [];
        incidentEdges.forEach(sie => {
            let stack = [];
            stack.push(sie);
            while (stack.length > 0) {
                let entryEdge = stack.pop();
                visited.push(entryEdge);
                let vertex = null;
                if (entryEdge.orientation == EdgeOrientation.NORMAL) {
                    vertex = graph.getVertexByNumber(entryEdge.v2nr);
                } else if (entryEdge.orientation == EdgeOrientation.REVERSED) {
                    vertex = graph.getVertexByNumber(entryEdge.v1nr);
                }
                if (vertex == null) {
                    console.error("vertex == null");
                    return;
                }
                if (vertex.number == graph.target) {
                    console.log('Found target');
                    // Reconstruct path
                    let partResult = [];
                    let lastConfirmed = graph.target;
                    for (let i = visited.length - 1; i >= 0; i--) {
                        let visitedEdge = visited[i];
                        if (visitedEdge.v1nr == lastConfirmed) {
                            partResult.push(visitedEdge);
                            lastConfirmed = visitedEdge.v2nr;
                        } else if (visitedEdge.v2nr == lastConfirmed) {
                            partResult.push(visitedEdge);
                            lastConfirmed = visitedEdge.v1nr;
                        }
                        if (lastConfirmed == graph.source) {
                            break;
                        }
                    }
                    result.push(partResult);
                    break;
                }
                if (entryEdge == null) {
                    console.error("entryEdge == null");
                    return;
                }
                let edgesRightOfEntryEdge = this.getEdgesRightOfEntryEdge(vertex, entryEdge);
                // Reverse order because stack is LIFO
                edgesRightOfEntryEdge.reverse();
                if (entryEdge.v1nr == 3 && entryEdge.v2nr == 5) {
                }
                edgesRightOfEntryEdge.forEach(e => {
                    if (eqIndexOf(visited, e, true, true) == -1) {
                        stack.push(e);
                    }
                });
            }
        });
        return result;
    }

    getEdgesRightOfEntryEdge(vertex, entryEdge) {
        let entryEdgeAngle = getAngle(vertex, graph.getOtherVertex(entryEdge, vertex));
        let incidentEdges = graph.getIncidentEdges(vertex, true);
        incidentEdges.sort((e1, e2) => {
            let otherVertex1 = graph.getOtherVertex(e1, vertex);
            let otherVertex2 = graph.getOtherVertex(e2, vertex);
            let angle1 = getAngle(vertex, otherVertex1);
            let angle2 = getAngle(vertex, otherVertex2);
            return angle2 - angle1;
        });
        let edgesRightOfEntryEdge = [];
        let nextSmallerEdgeIndex = -1;
        for (let i = 0; i < incidentEdges.length; i++) {
            let currAngle = getAngle(vertex, graph.getOtherVertex(incidentEdges[i], vertex));
            if (currAngle < entryEdgeAngle) {
                nextSmallerEdgeIndex = i;
                break;
            }
        }
        if (nextSmallerEdgeIndex == -1) {
            nextSmallerEdgeIndex = 0;
        }
        for (let i = nextSmallerEdgeIndex; i < incidentEdges.length; i++) {
            edgesRightOfEntryEdge.push(incidentEdges[i]);
        }
        for (let i = 0; i < nextSmallerEdgeIndex; i++) {
            edgesRightOfEntryEdge.push(incidentEdges[i]);
        }
        return edgesRightOfEntryEdge;
    }
}
