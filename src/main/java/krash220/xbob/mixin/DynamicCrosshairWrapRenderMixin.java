package krash220.xbob.mixin;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import krash220.xbob.game.api.DynamicCrosshairCompat;
import net.minecraft.client.gui.DrawContext;

@Pseudo
@Mixin(targets = "mod.crend.dynamiccrosshair.render.CrosshairRenderer", remap = false)
public class DynamicCrosshairWrapRenderMixin {

    @Inject(method = "wrapRender", at = @At("HEAD"), require = 0, remap = false)
    private static void xbob$arm(DrawContext context, int x, int y, Runnable pre, Runnable post, CallbackInfo ci) {
        DynamicCrosshairCompat.setArmed(true);
    }

    @Inject(method = "wrapRender", at = @At("RETURN"), require = 0, remap = false)
    private static void xbob$disarm(DrawContext context, int x, int y, Runnable pre, Runnable post, CallbackInfo ci) {
        DynamicCrosshairCompat.setArmed(false);
    }
}
