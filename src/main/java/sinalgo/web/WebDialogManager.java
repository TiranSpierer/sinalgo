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
package sinalgo.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import sinalgo.gui.helper.NodeSelectionHandler;
import sinalgo.nodes.Node;
import sinalgo.runtime.SinalgoRuntime;
import sinalgo.runtime.WebRuntime;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Manages dialog interactions between the Java backend and the web frontend.
 * Sends dialog requests via WebSocket and blocks until the frontend responds.
 */
public class WebDialogManager {

    private static final ObjectMapper mapper = new ObjectMapper();
    private static final AtomicLong tokenCounter = new AtomicLong(0);

    // Pending dialog responses: token -> response holder
    private static final Map<String, DialogResponse> pendingDialogs = new ConcurrentHashMap<>();

    // Pending node selection requests: token -> handler
    private static final Map<String, NodeSelectionHandler> pendingSelections = new ConcurrentHashMap<>();
    private static volatile String activeSelectionToken = null;

    /**
     * Show a message dialog in the browser. Blocks until the user dismisses it.
     */
    public static void showMessage(String text) {
        String token = "msg-" + tokenCounter.incrementAndGet();
        DialogResponse response = new DialogResponse();
        pendingDialogs.put(token, response);

        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "message_dialog");
        msg.put("token", token);
        msg.put("text", text);
        WebRuntime.broadcast(msg.toString());

        try {
            response.latch.await(120, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            pendingDialogs.remove(token);
        }
    }

    /**
     * Show a query dialog in the browser. Blocks until the user provides input.
     * @return The user's input, or null if cancelled/timed out.
     */
    public static String showQuery(String text) {
        String token = "query-" + tokenCounter.incrementAndGet();
        DialogResponse response = new DialogResponse();
        pendingDialogs.put(token, response);

        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "query_dialog");
        msg.put("token", token);
        msg.put("text", text);
        WebRuntime.broadcast(msg.toString());

        try {
            response.latch.await(120, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            pendingDialogs.remove(token);
        }
        return response.value;
    }

    /**
     * Show a confirm dialog in the browser. Blocks until the user clicks OK or Cancel.
     * @return true if the user clicked OK, false otherwise.
     */
    public static boolean showConfirm(String text) {
        String token = "confirm-" + tokenCounter.incrementAndGet();
        DialogResponse response = new DialogResponse();
        pendingDialogs.put(token, response);

        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "confirm_dialog");
        msg.put("token", token);
        msg.put("text", text);
        WebRuntime.broadcast(msg.toString());

        try {
            response.latch.await(120, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            pendingDialogs.remove(token);
        }
        return "ok".equals(response.value);
    }

    /**
     * Request the user to select a node in the browser.
     * Non-blocking: the handler is called when the user clicks a node or cancels.
     */
    public static void requestNodeSelection(NodeSelectionHandler handler, String text) {
        String token = "sel-" + tokenCounter.incrementAndGet();
        pendingSelections.put(token, handler);
        activeSelectionToken = token;

        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "select_node_request");
        msg.put("token", token);
        msg.put("text", text);
        WebRuntime.broadcast(msg.toString());
    }

    /**
     * Called when the frontend responds to a message or query dialog.
     */
    public static void handleDialogResponse(String token, String value) {
        DialogResponse response = pendingDialogs.get(token);
        if (response != null) {
            response.value = value;
            response.latch.countDown();
        }
    }

    /**
     * Called when the frontend responds to a node selection request.
     */
    public static void handleNodeSelection(String token, long nodeId) {
        NodeSelectionHandler handler = pendingSelections.remove(token);
        if (token.equals(activeSelectionToken)) {
            activeSelectionToken = null;
        }
        if (handler != null) {
            if (nodeId < 0) {
                handler.handleNodeSelectedEvent(null); // cancelled
            } else {
                Node node = findNodeById(nodeId);
                handler.handleNodeSelectedEvent(node);
            }
        }
    }

    /**
     * @return true if there is an active node selection request.
     */
    public static boolean isSelectionActive() {
        return activeSelectionToken != null;
    }

    /**
     * @return the active selection token, or null.
     */
    public static String getActiveSelectionToken() {
        return activeSelectionToken;
    }

    private static Node findNodeById(long id) {
        for (Node n : SinalgoRuntime.getNodes()) {
            if (n.getID() == id) {
                return n;
            }
        }
        return null;
    }

    private static class DialogResponse {
        volatile String value;
        final CountDownLatch latch = new CountDownLatch(1);
    }
}
