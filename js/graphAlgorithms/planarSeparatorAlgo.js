class PlanarSeparatorAlgo extends Algorithm {

    originalGraph = null;

    async run(runGraph = graph) {
        super.numSteps = "X";

        if (!this.preconditionsCheck()) {
            super.onFinished();
            return null;
        }

        this.originalGraph = graph.getCopy();

        await super.pause("Triangulate the graph", "Triangulate the graph");
        let triangulationAlgo = new TriangulationAlgo();
        triangulationAlgo.shouldContinue = true;
        triangulationAlgo.runComplete = true;
        triangulationAlgo.isSubAlgo = true;
        await triangulationAlgo.run();

        await super.pause("Construct breadth-first search tree", "Construct tree");
        let startVertex = runGraph.vertices[0];
        if (!this.isSubAlgo) {
            let startVertexNr = window.prompt("Enter start vertex number", "0");
            $.each(runGraph.vertices, function (_index, vertex) {
                if (vertex.number == startVertexNr) {
                    startVertex = vertex;
                    return false;
                }
            });
        }
        console.log('start vertex: ' + startVertex.print());
        let layers = breadthFirstSearchTree(startVertex, runGraph);
        this.showBFSTree(layers);

        await super.pause("Draw layers", "First layer on top, other layers below");
        this.drawLayerStructure(layers);

        for (var i = 0; i < layers.length; i++) {
            let vertexLayer = [];
            for (var j = 0; j < layers[i].length; j++) {
                vertexLayer.push(layers[i][j].vertex);
            }
            layers[i] = vertexLayer;
        }

        const n = runGraph.vertices.length;
        await super.pause("Find layer my",
            "Find layer my so that all layers below together have <= n/2="
            + (n / 2) + " vertices, and together with my have > n/2 vertices");
        let layerMyIdx = this.getLayerMy(layers);
        this.rectAroundLayer(layers, layerMyIdx, "green");

        const maxSeparatorSize = 4 * Math.sqrt(n);
        await super.pause("Check if layer my is a separator",
            "Check if layer my has <= 4*sqrt(n) vertices."
            + " In this case: |my|=" + layers[layerMyIdx].length + " <= 4*sqrt(n)=" + +maxSeparatorSize.toFixed(1) + "?");
        if (layers[layerMyIdx].length <= maxSeparatorSize) {
            this.rectAroundLayer(layers, layerMyIdx, "red");
            if (!this.isSubAlgo) {
                alert('Layer ' + layerMyIdx + ' is a separator');
            }

            let v1 = [];
            let v2 = [];
            for (var i = 0; i < layers.length; i++) {
                if (i < layerMyIdx) {
                    v1.push(i);
                } else if (i > layerMyIdx) {
                    v2.push(i);
                }
            }

            return this.transformBackAndGetReturnValues(layers, v1, [layerMyIdx], v2);
        }

        await super.pause("Find layers m and M",
            "Layer my was not a separator."
            + " Now find layers m before and M after my with |m|, |M| < sqrt(n)=" + +Math.sqrt(n).toFixed(1));
        let layersMmIndexes = this.getLayersMm(layers, layerMyIdx);
        let m_idx = layersMmIndexes[0];
        let M_idx = layersMmIndexes[1];
        if (m_idx != -1) {
            this.rectAroundLayer(layers, m_idx, "blue");
        }
        if (M_idx != -1) {
            this.rectAroundLayer(layers, M_idx, "blue");
        }
        let a_s = this.getAs(layers, m_idx, M_idx);
        let [a1, a2, a3] = a_s;
        let a2_len = 0;
        for (var i = 0; i < a2.length; i++) {
            a2_len += layers[a2[i]].length;
        }

        if (a2_len <= (2 / 3) * n) {
            // Case 1
            console.log('Case 1');
            await super.pause("Check if m u M is a separator",
                "Check if A2 (all layers between m and M) has <= 2/3 * n vertices."
                + " In this case: |A2|=" + a2_len + " <= 2/3 * n=" + +((2 / 3) * n).toFixed(1)
                + " -> Go to Case 1");
            // m u M is a separator
            await super.pause("Case 1: m u M is a separator",
                "S = m u M, V1 = max(|A1|, |A2|, |A3|), V2=V \ {S,V1}");
            let a_lengths = [a1.length, a2.length, a3.length];
            let max_a_idx = a_lengths.indexOf(Math.max(...a_lengths));
            let v1 = a_s[max_a_idx];
            let v2 = [];
            for (var i = 0; i < layers.length; i++) {
                if (i != m_idx && i != M_idx && !v1.includes(i)) {
                    v2.push(i);
                }
            }
            alert('m u M is a separator, V1=layers(' + v1 + '), V2=layers(' + v2 + ')');
            if (m_idx != -1) {
                this.rectAroundLayer(layers, m_idx, "red");
            }
            if (M_idx != -1) {
                this.rectAroundLayer(layers, M_idx, "red");
            }

            return this.transformBackAndGetReturnValues(layers, v1, [m_idx, M_idx], v2);
        } else {
            // Case 2
            await super.pause("Check if m u M is a separator",
                "Check if A2 (all layers between m and M) has <= 2/3 * n vertices."
                + " In this case: |A2|=" + a2_len + " > 2/3 * n=" + +((2 / 3) * n).toFixed(1)
                + " -> Go to Case 2");
            alert('Case 2: Not implemented yet');

            super.onFinished();
            return null;
        }
    }

    preconditionsCheck() {
        let fulfilled = true;
        if (!graph.isPlanarEmbedded()) {
            alert("Graph is not planar embedded!");
            fulfilled = false;
        }
        return fulfilled;
    }

    showBFSTree(layers) {
        console.log('layers: ' + layers.length);
        for (var i = 0; i < layers.length; i++) {
            for (var j = 0; j < layers[i].length; j++) {
                console.log(i + ' ' + layers[i][j].vertex.print());
            }
        }
        for (var i = 1; i < layers.length; i++) {
            let layer = layers[i];
            console.log('layer ' + i + ': ' + layer.length);
            for (var j = 0; j < layer.length; j++) {
                let bsVertex = layer[j];
                console.log('edge from ' + bsVertex.vertex.print() + ' to ' + bsVertex.parent.print());
                let edgeIndex = eqIndexOf(graph.edges, new Edge(bsVertex.vertex.number, bsVertex.parent.number));
                graph.edges[edgeIndex].color = "orange";
            }
        }
        redrawAll();
    }

    drawLayerStructure(layers) {
        let minPoint = new Point(graph.vertices[0].x, graph.vertices[0].y);
        let maxPoint = new Point(graph.vertices[0].x, graph.vertices[0].y);
        $.each(graph.vertices, function (_index, vertex) {
            if (vertex.x < minPoint.x) {
                minPoint.x = vertex.x;
            }
            if (vertex.y < minPoint.y) {
                minPoint.y = vertex.y;
            }
            if (vertex.x > maxPoint.x) {
                maxPoint.x = vertex.x;
            }
            if (vertex.y > maxPoint.y) {
                maxPoint.y = vertex.y;
            }
        });
        let width = maxPoint.x - minPoint.x;
        let height = maxPoint.y - minPoint.y;
        let layerHeight = height / layers.length;
        console.log('width=' + width + ' height=' + height + ' layerHeight=' + layerHeight);
        $.each(layers, function (layerIndex, layer) {
            $.each(layer, function (bsVertexIndex, bsVertex) {
                let vertexIndex = eqIndexOf(graph.vertices, bsVertex.vertex);
                graph.vertices[vertexIndex].x = minPoint.x + width / (layer.length + 1) * (bsVertexIndex + 1);
                graph.vertices[vertexIndex].y = minPoint.y + layerHeight * layerIndex;
                console.log('y ' + layerHeight * layerIndex);
            });
        });
        redrawAll();
    }

    // Finds the index of the layer so that there are < (n/2) vertices before it
    // and >= (n/2) vertices before and in it
    getLayerMy(layers) {
        const n = graph.vertices.length;
        let seperatorIndex = -1;
        let verticesBefore = 0;
        $.each(layers, function (layerIndex, layer) {
            console.log('n/2=' + n / 2 + ' verticesBefore=' + verticesBefore + ' verticesInclusive=' + (verticesBefore + layer.length));
            console.log('layer.length=' + layer.length + ' 4*sqrt(n)=' + 4 * Math.sqrt(n));
            if (verticesBefore < n / 2 && verticesBefore + layer.length > n / 2) {
                seperatorIndex = layerIndex;
                return;
            }
            verticesBefore += layer.length;
        });
        return seperatorIndex;
    }

    // Finds layers M above and m below my, so that m and M < sqrt(n)
    // Returns the indices in an array [m_idx, M_idx]
    getLayersMm(layers, layerMyIdx) {
        const n = graph.vertices.length;
        let m_idx = -1;
        for (let i = layerMyIdx - 1; i >= 0; i--) {
            if (layers[i].length < Math.sqrt(n)) {
                m_idx = i;
                break;
            }
        }
        let M_idx = -1;
        for (let i = layerMyIdx + 1; i < layers.length; i++) {
            if (layers[i].length < Math.sqrt(n)) {
                M_idx = i;
                break;
            }
        }
        return [m_idx, M_idx];
    }

    // Gets all the layers which are before (A1) between (A2) and after (A3) m and M.
    // If m is -1, m is considered to be -1; if M is -1, M is considered to be layers.length
    // Returns an array [A1, A2, A3], where each element is an array of indices of layers
    getAs(layers, m_idx, M_idx) {
        let a1 = [];
        let a2 = [];
        let a3 = [];
        if (M_idx == -1) {
            M_idx = layers.length;
        }
        for (let i = 0; i < m_idx; i++) {
            a1.push(i);
        }
        for (let i = m_idx + 1; i < M_idx; i++) {
            a2.push(i);
        }
        for (let i = M_idx + 1; i < layers.length; i++) {
            a3.push(i);
        }
        return [a1, a2, a3];
    }

    rectAroundLayer(layers, layerIndex, color) {
        var ctx = $("#fgCanvas")[0].getContext("2d");
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        let layerY = layers[layerIndex][0].y;
        let layerMinX = layers[layerIndex][0].x - 20;
        let layerMaxX = layers[layerIndex][layers[layerIndex].length - 1].x + 20;
        let width = layerMaxX - layerMinX;
        let height = 40;
        ctx.rect(layerMinX, layerY - 20, width, height);
        ctx.stroke();
        ctx.closePath();
    }

    async transformBackAndGetReturnValues(layers, v1, s, v2) {
        let v1_vertices = [];
        for (var i = 0; i < v1.length; i++) {
            v1_vertices = v1_vertices.concat(layers[v1[i]]);
        }
        let v2_vertices = [];
        for (var i = 0; i < v2.length; i++) {
            v2_vertices = v2_vertices.concat(layers[v2[i]]);
        }
        let s_vertices = [];
        for (var i = 0; i < s.length; i++) {
            s_vertices = s_vertices.concat(layers[s[i]]);
        }

        await super.pause("Transform back", "Transform back to original graph");
        this.transformBack();

        for (var i = 0; i < graph.vertices.length; i++) {
            let vertex = graph.vertices[i];
            if (eqIndexOf(v1_vertices, vertex) != -1) {
                vertex.color = "blue";
            }
            if (eqIndexOf(s_vertices, vertex) != -1) {
                vertex.color = "red";
            }
            if (eqIndexOf(v2_vertices, vertex) != -1) {
                vertex.color = "green";
            }
        }
        redrawAll();

        super.onFinished();

        return [v1_vertices, s_vertices, v2_vertices];
    }

    transformBack() {
        graph = this.originalGraph;
        redrawAll();
    }
}