package krash220.xbob.game.api;

import net.neoforged.fml.ModList;

public class DynamicCrosshairCompat {

    private static Boolean present;

    public static boolean isPresent() {
        if (present == null) {
            present = Boolean.valueOf(ModList.get().isLoaded("dynamiccrosshair"));
        }

        return present.booleanValue();
    }

    public static boolean shouldHandleCrosshair() {
        return isPresent() && DynamicCrosshairRenderer.isAvailable();
    }
}
