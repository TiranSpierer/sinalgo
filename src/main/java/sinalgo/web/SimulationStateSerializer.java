package sinalgo.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import sinalgo.nodes.Node;
import sinalgo.nodes.Position;
import sinalgo.nodes.edges.Edge;
import sinalgo.nodes.messages.Packet;
import sinalgo.runtime.Global;
import sinalgo.runtime.SinalgoRuntime;
import sinalgo.runtime.events.Event;
import sinalgo.runtime.events.PacketEvent;
import sinalgo.runtime.events.TimerEvent;

import java.awt.*;

/**
 * Serializes the current simulation state into JSON for the web frontend.
 */
public class SimulationStateSerializer {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static ObjectNode buildFullState() {
        ObjectNode root = mapper.createObjectNode();

        // Simulation metadata
        root.put("time", Global.getCurrentTime());
        root.put("running", Global.isRunning());
        root.put("async", Global.isAsynchronousMode());
        root.put("project", Global.getProjectName());
        root.put("messagesThisRound", Global.getNumberOfMessagesInThisRound());
        root.put("messagesTotal", Global.getNumberOfMessagesOverAll());

        // Nodes
        ArrayNode nodesArray = root.putArray("nodes");
        for (Node n : SinalgoRuntime.getNodes()) {
            ObjectNode nodeObj = mapper.createObjectNode();
            nodeObj.put("id", n.getID());
            Position p = n.getPosition();
            nodeObj.put("x", p.getXCoord());
            nodeObj.put("y", p.getYCoord());
            nodeObj.put("z", p.getZCoord());
            nodeObj.put("color", colorToHex(n.getColor()));
            nodeObj.put("type", n.getClass().getSimpleName());
            nodesArray.add(nodeObj);
        }

        // Edges (collect from all node outgoing connections, deduplicate)
        ArrayNode edgesArray = root.putArray("edges");
        for (Node n : SinalgoRuntime.getNodes()) {
            for (Edge e : n.getOutgoingConnections()) {
                ObjectNode edgeObj = mapper.createObjectNode();
                edgeObj.put("from", e.getStartNode().getID());
                edgeObj.put("to", e.getEndNode().getID());
                edgeObj.put("color", colorToHex(e.getColor()));
                edgesArray.add(edgeObj);
            }
        }

        // Packets in flight
        ArrayNode packetsArray = root.putArray("packets");
        synchronized (Packet.ISSUED_PACKETS) {
            for (Packet pkt : Packet.ISSUED_PACKETS) {
                ObjectNode pktObj = mapper.createObjectNode();
                pktObj.put("from", pkt.getOrigin().getID());
                pktObj.put("to", pkt.getDestination().getID());
                pktObj.put("sendTime", pkt.getSendingTime());
                pktObj.put("arriveTime", pkt.getArrivingTime());
                pktObj.put("type", pkt.getMessage().getClass().getSimpleName());
                packetsArray.add(pktObj);
            }
        }

        // Event queue (async mode only, first N events)
        if (Global.isAsynchronousMode()) {
            ArrayNode eventsArray = root.putArray("events");
            int count = 0;
            for (Event ev : SinalgoRuntime.getEventQueue()) {
                if (count >= 50) break;
                ObjectNode evObj = mapper.createObjectNode();
                evObj.put("time", ev.getTime());
                if (ev instanceof PacketEvent) {
                    evObj.put("kind", "packet");
                    Packet p = ((PacketEvent) ev).getPacket();
                    evObj.put("from", p.getOrigin().getID());
                    evObj.put("to", p.getDestination().getID());
                } else if (ev instanceof TimerEvent) {
                    TimerEvent te = (TimerEvent) ev;
                    evObj.put("kind", "timer");
                    if (te.getTimer().isNodeTimer()) {
                        evObj.put("node", te.getTimer().getTargetNode().getID());
                    }
                } else {
                    evObj.put("kind", ev.getClass().getSimpleName());
                }
                eventsArray.add(evObj);
                count++;
            }
        }

        return root;
    }

    public static ObjectNode buildNodeInfo(Node n) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("id", n.getID());
        Position p = n.getPosition();
        obj.put("x", p.getXCoord());
        obj.put("y", p.getYCoord());
        obj.put("z", p.getZCoord());
        obj.put("color", colorToHex(n.getColor()));
        obj.put("type", n.getClass().getName());
        obj.put("connections", countConnections(n));
        obj.put("toString", n.toString());
        if (n.getConnectivityModel() != null) {
            obj.put("connectivityModel", n.getConnectivityModel().getClass().getSimpleName());
        }
        if (n.getMobilityModel() != null) {
            obj.put("mobilityModel", n.getMobilityModel().getClass().getSimpleName());
        }
        if (n.getInterferenceModel() != null) {
            obj.put("interferenceModel", n.getInterferenceModel().getClass().getSimpleName());
        }
        if (n.getReliabilityModel() != null) {
            obj.put("reliabilityModel", n.getReliabilityModel().getClass().getSimpleName());
        }
        return obj;
    }

    public static ObjectNode buildEdgeInfo(Edge e) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("from", e.getStartNode().getID());
        obj.put("to", e.getEndNode().getID());
        obj.put("type", e.getClass().getSimpleName());
        obj.put("color", colorToHex(e.getColor()));
        obj.put("toString", e.toString());
        return obj;
    }

    private static int countConnections(Node n) {
        int count = 0;
        for (Edge ignored : n.getOutgoingConnections()) {
            count++;
        }
        return count;
    }

    private static String colorToHex(Color c) {
        return String.format("#%02x%02x%02x", c.getRed(), c.getGreen(), c.getBlue());
    }
}
