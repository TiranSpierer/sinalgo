/*
BSD 3-Clause License

Copyright (c) 2007-2013, Distributed Computing Group (DCG)
                         ETH Zurich
                         Switzerland
                         dcg.ethz.ch
              2017-2018, André Brait

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
package sinalgo.runtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import io.javalin.websocket.WsContext;
import sinalgo.configuration.Configuration;
import sinalgo.configuration.Configuration.ImplementationChoiceInConfigFile.ImplementationType;
import sinalgo.exception.SinalgoWrappedException;
import sinalgo.nodes.Node;
import sinalgo.nodes.Position;
import sinalgo.nodes.edges.Edge;
import sinalgo.tools.Tools;
import sinalgo.tools.logging.LogL;
import sinalgo.web.AnnotationScanner;
import sinalgo.web.SimulationStateSerializer;
import sinalgo.web.WebDialogManager;

import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Runtime for the web-based UI. Starts an embedded Javalin HTTP server
 * that serves the React frontend and exposes REST/WebSocket APIs for
 * controlling the simulation from the browser.
 */
public class WebRuntime extends SinalgoRuntime {

    private static final int DEFAULT_PORT = 8765;
    private static final ObjectMapper mapper = new ObjectMapper();
    private static WebRuntime instance;
    private static volatile boolean abortRequested;
    private Javalin app;
    private final Set<WsContext> wsClients = new CopyOnWriteArraySet<>();

    /**
     * Push state from the static instance (called by runtime threads).
     */
    public static void pushStateIfActive() {
        WebRuntime rt = instance;
        if (rt != null) {
            rt.pushState();
        }
    }

    /**
     * Check if abort was requested from the web UI.
     */
    public static boolean isAbortRequested() {
        return abortRequested;
    }

    /**
     * Clear the abort flag (called before starting a new simulation).
     */
    public static void clearAbort() {
        abortRequested = false;
    }

    /**
     * Broadcast a JSON message to all connected WebSocket clients.
     */
    public static void broadcast(String json) {
        WebRuntime rt = instance;
        if (rt == null) return;
        for (WsContext ctx : rt.wsClients) {
            try {
                ctx.send(json);
            } catch (Exception e) {
                rt.wsClients.remove(ctx);
            }
        }
    }

    /**
     * Push the current simulation state to all connected WebSocket clients.
     */
    public void pushState() {
        if (wsClients.isEmpty()) return;
        try {
            String json = SimulationStateSerializer.buildFullState().toString();
            for (WsContext ctx : wsClients) {
                try {
                    ctx.send(json);
                } catch (Exception e) {
                    wsClients.remove(ctx);
                }
            }
        } catch (Exception e) {
            // ignore serialization errors
        }
    }

    @Override
    public void initConcreteRuntime() {
        instance = this;
        synchronized (this) {
            try {
                if (!this.isNodeCreationFinished()) {
                    this.wait();
                }
            } catch (InterruptedException e) {
                throw new SinalgoWrappedException(e);
            }
        }

        if (Global.isAsynchronousMode() && Configuration.isInitializeConnectionsOnStartup()) {
            if (SinalgoRuntime.getNodes().size() > 0) {
                AsynchronousRuntimeThread.initializeConnectivity();
            }
        }

        app = Javalin.create(config -> {
            config.addStaticFiles("/web", Location.CLASSPATH);
            config.enableCorsForAllOrigins();
        });

        registerEndpoints();

        app.start(DEFAULT_PORT);

        Global.getLog().logln(LogL.ALWAYS,
                "> Web UI server started on http://localhost:" + DEFAULT_PORT);
    }

    private void registerEndpoints() {
        // WebSocket for real-time state streaming
        app.ws("/ws", ws -> {
            ws.onConnect(ctx -> {
                wsClients.add(ctx);
                // Send initial full state
                try {
                    ctx.send(SimulationStateSerializer.buildFullState().toString());
                } catch (Exception e) {
                    // ignore
                }
            });
            ws.onClose(ctx -> wsClients.remove(ctx));
            ws.onError(ctx -> wsClients.remove(ctx));
        });

        // Health check
        app.get("/api/health", ctx -> ctx.json(Collections.singletonMap("status", "ok")));

        // List available projects
        app.get("/api/projects", ctx -> {
            ctx.json(Global.getProjectNames());
        });

        // Full simulation state snapshot
        app.get("/api/state", ctx -> {
            ctx.json(SimulationStateSerializer.buildFullState());
        });

        // Configuration
        app.get("/api/config", ctx -> {
            ObjectNode config = mapper.createObjectNode();
            config.put("dimX", Configuration.getDimX());
            config.put("dimY", Configuration.getDimY());
            config.put("dimZ", Configuration.getDimZ());
            config.put("dimensions", Configuration.getDimensions());
            config.put("async", Configuration.isAsynchronousMode());
            config.put("mobility", Configuration.isMobility());
            config.put("interference", Configuration.isInterference());
            config.put("refreshRate", Configuration.getRefreshRate());
            config.put("edgeType", Configuration.getEdgeType());
            config.put("defaultNodeImpl", Configuration.getDefaultNodeImplementation());
            config.put("defaultConnectivity", Configuration.getDefaultConnectivityModel());
            config.put("defaultDistribution", Configuration.getDefaultDistributionModel());
            config.put("defaultMobility", Configuration.getDefaultMobilityModel());
            config.put("defaultReliability", Configuration.getDefaultReliabilityModel());
            config.put("defaultInterference", Configuration.getDefaultInterferenceModel());
            config.put("defaultMsgTransmission", Configuration.getDefaultMessageTransmissionModel());
            config.put("drawArrows", Configuration.isDrawArrows());
            config.put("drawEdges", Configuration.isDrawEdges());
            config.put("drawNodes", Configuration.isDrawNodes());
            config.put("showMessageAnimations", Configuration.isShowMessageAnimations());
            try {
                config.put("nodeDefaultSize", Configuration.getIntegerParameter("Node/defaultSize"));
            } catch (Exception e) {
                config.put("nodeDefaultSize", 2);
            }
            ctx.json(config);
        });

        // Start simulation
        app.post("/api/start", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            long rounds = body.has("rounds") ? body.get("rounds").asLong(1) : 1;
            if (rounds == -1) {
                rounds = Long.MAX_VALUE; // Run forever
            }
            startSimulation(rounds);
            ctx.json(Collections.singletonMap("started", true));
        });

        // Stop simulation
        app.post("/api/stop", ctx -> {
            abortRequested = true;
            ctx.json(Collections.singletonMap("stopped", true));
        });

        // Clear all nodes
        app.post("/api/clear", ctx -> {
            SinalgoRuntime.clearAllNodes();
            pushState();
            ctx.json(Collections.singletonMap("cleared", true));
        });

        // Generate nodes
        app.post("/api/generate-nodes", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            int count = body.get("count").asInt();
            String nodeType = body.has("nodeType") ? body.get("nodeType").asText()
                    : Configuration.getDefaultNodeImplementation();
            String distribution = body.has("distribution") ? body.get("distribution").asText()
                    : Configuration.getDefaultDistributionModel();

            List<String> modelArgs = new ArrayList<>();
            if (body.has("connectivity")) {
                modelArgs.add("C=" + body.get("connectivity").asText());
            }
            if (body.has("interference")) {
                modelArgs.add("I=" + body.get("interference").asText());
            }
            if (body.has("mobility")) {
                modelArgs.add("M=" + body.get("mobility").asText());
            }
            if (body.has("reliability")) {
                modelArgs.add("R=" + body.get("reliability").asText());
            }

            Tools.generateNodes(count, nodeType, distribution, modelArgs.toArray(new String[0]));
            SinalgoRuntime.reevaluateConnections();
            pushState();
            ctx.json(Collections.singletonMap("generated", count));
        });

        // Reevaluate connections
        app.post("/api/reevaluate", ctx -> {
            SinalgoRuntime.reevaluateConnections();
            pushState();
            ctx.json(Collections.singletonMap("reevaluated", true));
        });

        // Get node info
        app.get("/api/node/{id}", ctx -> {
            long id = Long.parseLong(ctx.pathParam("id"));
            Node node = findNodeById(id);
            if (node == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
            } else {
                ctx.json(SimulationStateSerializer.buildNodeInfo(node));
            }
        });

        // Remove node
        app.delete("/api/node/{id}", ctx -> {
            long id = Long.parseLong(ctx.pathParam("id"));
            Node node = findNodeById(id);
            if (node == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
            } else {
                SinalgoRuntime.removeNode(node);
                pushState();
                ctx.json(Collections.singletonMap("removed", id));
            }
        });

        // Move/reposition a node
        app.post("/api/node/{id}/move", ctx -> {
            long id = Long.parseLong(ctx.pathParam("id"));
            Node node = findNodeById(id);
            if (node == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
                return;
            }
            JsonNode body = mapper.readTree(ctx.body());
            double x = body.get("x").asDouble();
            double y = body.get("y").asDouble();
            double z = body.has("z") ? body.get("z").asDouble() : 0;
            node.getPosition().assign(x, y, z);
            pushState();
            ctx.json(Collections.singletonMap("moved", true));
        });

        // Add a single node at a specific position
        app.post("/api/add-node", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            double x = body.get("x").asDouble();
            double y = body.get("y").asDouble();
            double z = body.has("z") ? body.get("z").asDouble() : 0;
            String type = body.has("type") ? body.get("type").asText()
                    : Configuration.getDefaultNodeImplementation();
            try {
                Node node = Node.createNodeByClassname(type);
                node.setPosition(new Position(x, y, z));
                node.finishInitializationWithDefaultModels(true);
                pushState();
                ctx.json(Collections.singletonMap("id", node.getID()));
            } catch (Exception e) {
                ctx.status(500).json(Collections.singletonMap("error", e.getMessage()));
            }
        });

        // Add an edge between two nodes
        app.post("/api/add-edge", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            long fromId = body.get("from").asLong();
            long toId = body.get("to").asLong();
            Node fromNode = findNodeById(fromId);
            Node toNode = findNodeById(toId);
            if (fromNode == null || toNode == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
                return;
            }
            fromNode.addConnectionTo(toNode);
            pushState();
            ctx.json(Collections.singletonMap("added", true));
        });

        // Get edge info
        app.get("/api/edge/{fromId}/{toId}", ctx -> {
            long fromId = Long.parseLong(ctx.pathParam("fromId"));
            long toId = Long.parseLong(ctx.pathParam("toId"));
            Node fromNode = findNodeById(fromId);
            Node toNode = findNodeById(toId);
            if (fromNode == null || toNode == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
                return;
            }
            Edge edge = findEdge(fromNode, toNode);
            if (edge == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Edge not found"));
                return;
            }
            ctx.json(SimulationStateSerializer.buildEdgeInfo(edge));
        });

        // Delete a specific edge
        app.delete("/api/edge/{fromId}/{toId}", ctx -> {
            long fromId = Long.parseLong(ctx.pathParam("fromId"));
            long toId = Long.parseLong(ctx.pathParam("toId"));
            Node fromNode = findNodeById(fromId);
            Node toNode = findNodeById(toId);
            if (fromNode == null || toNode == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
                return;
            }
            Edge edge = findEdge(fromNode, toNode);
            if (edge == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Edge not found"));
                return;
            }
            SinalgoRuntime.removeEdge(edge);
            pushState();
            ctx.json(Collections.singletonMap("removed", true));
        });

        // List @GlobalMethod entries
        app.get("/api/global-methods", ctx -> {
            ctx.json(AnnotationScanner.getGlobalMethods());
        });

        // Invoke a @GlobalMethod
        app.post("/api/global-method/{id}", ctx -> {
            int methodId = Integer.parseInt(ctx.pathParam("id"));
            try {
                AnnotationScanner.invokeGlobalMethod(methodId);
                pushState();
                ctx.json(Collections.singletonMap("invoked", methodId));
            } catch (Exception e) {
                ctx.status(500).json(Collections.singletonMap("error", e.getMessage()));
            }
        });

        // List @CustomButton entries
        app.get("/api/custom-buttons", ctx -> {
            ctx.json(AnnotationScanner.getCustomButtons());
        });

        // List @NodePopupMethod entries for a node
        app.get("/api/node/{id}/popup-methods", ctx -> {
            long id = Long.parseLong(ctx.pathParam("id"));
            Node node = findNodeById(id);
            if (node == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
            } else {
                ctx.json(AnnotationScanner.getNodePopupMethods(node));
            }
        });

        // Invoke a @NodePopupMethod
        app.post("/api/node/{id}/popup-method/{mid}", ctx -> {
            long id = Long.parseLong(ctx.pathParam("id"));
            int methodId = Integer.parseInt(ctx.pathParam("mid"));
            Node node = findNodeById(id);
            if (node == null) {
                ctx.status(404).json(Collections.singletonMap("error", "Node not found"));
                return;
            }
            try {
                AnnotationScanner.invokeNodePopupMethod(node, methodId);
                pushState();
                ctx.json(Collections.singletonMap("invoked", methodId));
            } catch (Exception e) {
                ctx.status(500).json(Collections.singletonMap("error", e.getMessage()));
            }
        });

        // List model implementations by type
        app.get("/api/implementations/{type}", ctx -> {
            String typeStr = ctx.pathParam("type").toUpperCase();
            try {
                ImplementationType type = ImplementationType.valueOf(typeStr);
                Vector<String> impls = Global.getImplementations(type);
                ctx.json(impls);
            } catch (IllegalArgumentException e) {
                // Return all valid types if the requested one doesn't exist
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("error", "Unknown type: " + typeStr);
                result.put("validTypes", Arrays.asList(ImplementationType.values()));
                ctx.status(400).json(result);
            }
        });

        // Dialog response (message dismiss or query answer)
        app.post("/api/dialog-response", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            String token = body.get("token").asText();
            String value = body.has("value") ? body.get("value").asText() : null;
            WebDialogManager.handleDialogResponse(token, value);
            ctx.json(Collections.singletonMap("ok", true));
        });

        // Node selection response
        app.post("/api/select-node", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            String token = body.get("token").asText();
            long nodeId = body.has("nodeId") ? body.get("nodeId").asLong(-1) : -1;
            WebDialogManager.handleNodeSelection(token, nodeId);
            pushState();
            ctx.json(Collections.singletonMap("ok", true));
        });

        // Set refresh rate
        app.post("/api/set-refresh-rate", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            int rate = body.get("rate").asInt();
            if (rate > 0) {
                Configuration.setRefreshRate(rate);
            }
            ctx.json(Collections.singletonMap("refreshRate", Configuration.getRefreshRate()));
        });

        // Get preferences
        app.get("/api/preferences", ctx -> {
            ObjectNode prefs = mapper.createObjectNode();
            prefs.put("drawArrows", Configuration.isDrawArrows());
            prefs.put("drawEdges", Configuration.isDrawEdges());
            prefs.put("drawNodes", Configuration.isDrawNodes());
            prefs.put("showMessageAnimations", Configuration.isShowMessageAnimations());
            ctx.json(prefs);
        });

        // Set preferences
        app.post("/api/preferences", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            if (body.has("drawArrows")) Configuration.setDrawArrows(body.get("drawArrows").asBoolean());
            if (body.has("drawEdges")) Configuration.setDrawEdges(body.get("drawEdges").asBoolean());
            if (body.has("drawNodes")) Configuration.setDrawNodes(body.get("drawNodes").asBoolean());
            if (body.has("showMessageAnimations")) Configuration.setShowMessageAnimations(body.get("showMessageAnimations").asBoolean());
            // Re-fetch config so the frontend gets the updated values
            pushState();
            ObjectNode prefs = mapper.createObjectNode();
            prefs.put("drawArrows", Configuration.isDrawArrows());
            prefs.put("drawEdges", Configuration.isDrawEdges());
            prefs.put("drawNodes", Configuration.isDrawNodes());
            prefs.put("showMessageAnimations", Configuration.isShowMessageAnimations());
            ctx.json(prefs);
        });

        // Get full settings dump as text
        app.get("/api/settings", ctx -> {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            java.io.PrintStream ps = new java.io.PrintStream(baos);
            Configuration.printConfiguration(ps);
            ctx.json(Collections.singletonMap("settings", baos.toString()));
        });
    }

    private void startSimulation(long rounds) {
        if (Global.isRunning()) {
            return;
        }
        if (rounds <= 0) {
            rounds = Long.MAX_VALUE;
        }
        abortRequested = false;

        if (Configuration.isAsynchronousMode()) {
            AsynchronousRuntimeThread arT = new AsynchronousRuntimeThread();
            arT.setNumberOfEvents(rounds);
            arT.setRefreshRate(Configuration.getRefreshRate());
            Global.setRunning(true);
            arT.start();
        } else {
            SynchronousRuntimeThread sRT = new SynchronousRuntimeThread();
            sRT.setNumberOfRounds(rounds);
            sRT.setRefreshRate(Configuration.getRefreshRate());
            Global.setRunning(true);
            sRT.start();
        }
    }

    private static Node findNodeById(long id) {
        for (Node n : SinalgoRuntime.getNodes()) {
            if (n.getID() == id) {
                return n;
            }
        }
        return null;
    }

    private static Edge findEdge(Node from, Node to) {
        for (Edge e : from.getOutgoingConnections()) {
            if (e.getEndNode().getID() == to.getID()) {
                return e;
            }
        }
        return null;
    }

    @Override
    public void run(long rounds, boolean considerInfiniteRunFlag) {
        if (rounds > 0 && !Global.isRunning()) {
            startSimulation(rounds);
        }

        // Keep the process alive while the web server is running.
        // Javalin uses daemon threads, so without this the JVM would exit.
        synchronized (this) {
            try {
                this.wait();
            } catch (InterruptedException e) {
                // shutdown
            }
        }
    }

    @Override
    public void initProgress() {
        this.createNodes();
    }

    @Override
    public void setProgress(double percent) {
        // Progress is pushed via WebSocket state updates
    }
}
