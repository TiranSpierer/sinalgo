package sinalgo.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import sinalgo.nodes.Node;
import sinalgo.runtime.AbstractCustomGlobal;
import sinalgo.runtime.Global;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Scans for @GlobalMethod, @CustomButton, and @NodePopupMethod annotations
 * via reflection, and returns their metadata as JSON for the web frontend.
 */
public class AnnotationScanner {

    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * Returns all @GlobalMethod methods from the CustomGlobal and Global classes.
     */
    public static ArrayNode getGlobalMethods() {
        ArrayNode result = mapper.createArrayNode();
        AbstractCustomGlobal cg = Global.getCustomGlobal();
        List<Method> methods = new ArrayList<>();

        // Scan the project's CustomGlobal
        for (Method m : cg.getClass().getMethods()) {
            if (m.isAnnotationPresent(AbstractCustomGlobal.GlobalMethod.class)) {
                methods.add(m);
            }
        }

        // Sort by declared order
        methods.sort(Comparator.comparingInt(m -> {
            AbstractCustomGlobal.GlobalMethod ann = m.getAnnotation(AbstractCustomGlobal.GlobalMethod.class);
            return ann != null ? ann.order() : 0;
        }));

        for (int i = 0; i < methods.size(); i++) {
            Method m = methods.get(i);
            AbstractCustomGlobal.GlobalMethod ann = m.getAnnotation(AbstractCustomGlobal.GlobalMethod.class);
            ObjectNode obj = mapper.createObjectNode();
            obj.put("id", i);
            obj.put("name", m.getName());
            obj.put("menuText", ann.menuText());
            obj.put("subMenu", ann.subMenu());
            obj.put("order", ann.order());
            result.add(obj);
        }

        return result;
    }

    /**
     * Returns all @CustomButton methods from the CustomGlobal.
     */
    public static ArrayNode getCustomButtons() {
        ArrayNode result = mapper.createArrayNode();
        AbstractCustomGlobal cg = Global.getCustomGlobal();

        int idx = 0;
        for (Method m : cg.getClass().getMethods()) {
            if (m.isAnnotationPresent(AbstractCustomGlobal.CustomButton.class)) {
                AbstractCustomGlobal.CustomButton ann = m.getAnnotation(AbstractCustomGlobal.CustomButton.class);
                ObjectNode obj = mapper.createObjectNode();
                obj.put("id", idx++);
                obj.put("name", m.getName());
                obj.put("buttonText", ann.buttonText());
                obj.put("toolTipText", ann.toolTipText());
                result.add(obj);
            }
        }

        return result;
    }

    /**
     * Returns all @NodePopupMethod methods for a specific node.
     */
    public static ArrayNode getNodePopupMethods(Node node) {
        ArrayNode result = mapper.createArrayNode();

        int idx = 0;
        for (Method m : node.getClass().getMethods()) {
            if (m.isAnnotationPresent(Node.NodePopupMethod.class)) {
                Node.NodePopupMethod ann = m.getAnnotation(Node.NodePopupMethod.class);
                String text = node.includeMethodInPopupMenu(m, ann.menuText());
                if (text == null) {
                    continue; // node dismissed this menu item
                }
                ObjectNode obj = mapper.createObjectNode();
                obj.put("id", idx);
                obj.put("name", m.getName());
                obj.put("menuText", text);
                result.add(obj);
            }
            idx++;
        }

        return result;
    }

    /**
     * Invokes a @GlobalMethod by index (in the sorted order).
     */
    public static void invokeGlobalMethod(int methodIndex) throws Exception {
        AbstractCustomGlobal cg = Global.getCustomGlobal();
        List<Method> methods = new ArrayList<>();
        for (Method m : cg.getClass().getMethods()) {
            if (m.isAnnotationPresent(AbstractCustomGlobal.GlobalMethod.class)) {
                methods.add(m);
            }
        }
        methods.sort(Comparator.comparingInt(m -> {
            AbstractCustomGlobal.GlobalMethod ann = m.getAnnotation(AbstractCustomGlobal.GlobalMethod.class);
            return ann != null ? ann.order() : 0;
        }));
        if (methodIndex < 0 || methodIndex >= methods.size()) {
            throw new IllegalArgumentException("Invalid method index: " + methodIndex);
        }
        methods.get(methodIndex).invoke(cg);
    }

    /**
     * Invokes a @NodePopupMethod by raw method-array index on a specific node.
     */
    public static void invokeNodePopupMethod(Node node, int methodIndex) throws Exception {
        Method[] allMethods = node.getClass().getMethods();
        if (methodIndex < 0 || methodIndex >= allMethods.length) {
            throw new IllegalArgumentException("Invalid method index: " + methodIndex);
        }
        Method m = allMethods[methodIndex];
        if (!m.isAnnotationPresent(Node.NodePopupMethod.class)) {
            throw new IllegalArgumentException("Method at index " + methodIndex + " is not a @NodePopupMethod");
        }
        m.invoke(node);
    }
}
