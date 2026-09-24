package krash220.xbob.mixin;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import krash220.xbob.MainMod;
import krash220.xbob.game.api.DynamicCrosshairRenderer;
import net.minecraft.client.gui.GuiGraphics;

@Pseudo
@Mixin(targets = "mod.crend.libbamboo.render.CustomFramebufferRenderer", remap = false)
public class CustomFramebufferRendererMixin {

    @Inject(method = "draw", at = @At("HEAD"), require = 0, remap = false)
    private static void xbob$beforeDraw(GuiGraphics graphics, CallbackInfo ci) {
        if (DynamicCrosshairRenderer.isArmed()) {
            MainMod.preDynamicCrosshair(graphics.pose());
        }
    }

    @Inject(method = "draw", at = @At("RETURN"), require = 0, remap = false)
    private static void xbob$afterDraw(GuiGraphics graphics, CallbackInfo ci) {
        if (DynamicCrosshairRenderer.isArmed()) {
            MainMod.postDynamicCrosshair(graphics.pose());
        }
    }
}
