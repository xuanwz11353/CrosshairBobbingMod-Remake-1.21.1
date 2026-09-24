package krash220.xbob.game.api;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import krash220.xbob.MainMod;
import net.minecraft.client.gui.GuiGraphics;

public class DynamicCrosshairRenderer {

    private static boolean initialized;
    private static boolean available;
    private static boolean armed;

    private static Method preRender;
    private static Method postRender;
    private static Method fixCenteredPre;
    private static Method fixCenteredPost;
    private static Method render;
    private static Method renderCrosshairWithStyle;
    private static Method getDefaultCrosshair;
    private static Method shouldShowCrosshair;
    private static Field forceShowCrosshair;
    private static Field config;
    private static Method isFixCenteredCrosshair;
    private static Method isDynamicCrosshairStyle;

    private static synchronized void init() {
        if (initialized) {
            return;
        }

        initialized = true;

        try {
            Class<?> renderer = Class.forName("mod.crend.dynamiccrosshair.render.CrosshairRenderer");
            Class<?> handler = Class.forName("mod.crend.dynamiccrosshair.component.CrosshairHandler");
            Class<?> mod = Class.forName("mod.crend.dynamiccrosshair.DynamicCrosshairMod");
            Class<?> configHandler = Class.forName("mod.crend.dynamiccrosshair.config.ConfigHandler");
            Class<?> style = Class.forName("mod.crend.dynamiccrosshair.style.CrosshairStyle");
            Class<?> framebuffer = Class.forName("mod.crend.libbamboo.render.CustomFramebufferRenderer");

            renderer.getMethod("wrapRender", GuiGraphics.class, int.class, int.class, Runnable.class, Runnable.class);
            framebuffer.getMethod("draw", GuiGraphics.class);

            preRender = renderer.getMethod("preRender");
            postRender = renderer.getMethod("postRender");
            fixCenteredPre = renderer.getMethod("fixCenteredCrosshairPre", GuiGraphics.class, int.class, int.class);
            fixCenteredPost = renderer.getMethod("fixCenteredCrosshairPost", GuiGraphics.class);
            render = renderer.getMethod("render", GuiGraphics.class, int.class, int.class);
            renderCrosshairWithStyle = renderer.getMethod("renderCrosshair", GuiGraphics.class, style, int.class, int.class);
            getDefaultCrosshair = handler.getMethod("getDefaultCrosshair");
            shouldShowCrosshair = handler.getMethod("shouldShowCrosshair");
            forceShowCrosshair = handler.getField("forceShowCrosshair");
            config = mod.getField("config");
            isFixCenteredCrosshair = configHandler.getMethod("isFixCenteredCrosshair");
            isDynamicCrosshairStyle = configHandler.getMethod("isDynamicCrosshairStyle");

            available = true;
        } catch (ReflectiveOperationException e) {
            available = false;
        }
    }

    public static boolean isAvailable() {
        init();

        return available;
    }

    public static boolean isArmed() {
        return armed;
    }

    public static void render(GuiGraphics graphics, int x, int y) {
        if (!available) {
            return;
        }

        try {
            boolean force = forceShowCrosshair.getBoolean(null);

            if (!force && !((Boolean) shouldShowCrosshair.invoke(null)).booleanValue()) {
                return;
            }

            preRender.invoke(null);

            Object cfg = config.get(null);
            boolean fixCentered = ((Boolean) isFixCenteredCrosshair.invoke(cfg)).booleanValue();

            if (fixCentered) {
                fixCenteredPre.invoke(null, graphics, x, y);
            }

            if (((Boolean) isDynamicCrosshairStyle.invoke(cfg)).booleanValue()) {
                armed = true;

                try {
                    render.invoke(null, graphics, x, y);
                } finally {
                    armed = false;
                }
            } else {
                MainMod.preDynamicCrosshair(graphics.pose());

                try {
                    renderCrosshairWithStyle.invoke(null, graphics, getDefaultCrosshair.invoke(null), x, y);
                } finally {
                    MainMod.postDynamicCrosshair(graphics.pose());
                }

                graphics.flush();
            }

            if (fixCentered) {
                fixCenteredPost.invoke(null, graphics);
            }

            postRender.invoke(null);
        } catch (ReflectiveOperationException e) {
        }
    }
}
