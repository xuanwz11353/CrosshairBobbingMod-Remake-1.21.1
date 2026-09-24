package krash220.xbob.game.api;

import net.fabricmc.loader.api.FabricLoader;

public class DynamicCrosshairCompat {

    private static Boolean present;
    private static boolean armed;

    public static boolean isPresent() {
        if (present == null) {
            present = Boolean.valueOf(FabricLoader.getInstance().isModLoaded("dynamiccrosshair"));
        }

        return present.booleanValue();
    }

    public static boolean isArmed() {
        return armed;
    }

    public static void setArmed(boolean value) {
        armed = value;
    }
}
