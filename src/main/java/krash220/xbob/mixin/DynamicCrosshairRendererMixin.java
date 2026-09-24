package krash220.xbob.mixin;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import krash220.xbob.game.api.DynamicCrosshairCompat;
import krash220.xbob.game.api.DynamicCrosshairRenderer;
import net.minecraft.client.gui.GuiGraphics;

@Pseudo
@Mixin(targets = "mod.crend.dynamiccrosshair.render.CrosshairRenderer", remap = false)
public class DynamicCrosshairRendererMixin {

    @Inject(method = "wrapRender", at = @At("HEAD"), cancellable = true, require = 0, remap = false)
    private static void xbob$takeover(GuiGraphics graphics, int x, int y, Runnable pre, Runnable post, CallbackInfo ci) {
        if (!DynamicCrosshairCompat.shouldHandleCrosshair()) {
            return;
        }

        ci.cancel();

        DynamicCrosshairRenderer.render(graphics, x, y);
    }
}
