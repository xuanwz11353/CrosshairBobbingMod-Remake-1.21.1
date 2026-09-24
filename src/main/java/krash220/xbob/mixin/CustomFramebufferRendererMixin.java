package krash220.xbob.mixin;

import org.joml.Matrix4f;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import krash220.xbob.game.api.DynamicCrosshairCompat;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.util.math.MatrixStack;

@Pseudo
@Mixin(targets = "mod.crend.libbamboo.render.CustomFramebufferRenderer", remap = false)
public class CustomFramebufferRendererMixin {

    @Inject(method = "draw", at = @At("HEAD"), require = 0, remap = false)
    private static void xbob$beforeDraw(DrawContext context, CallbackInfo ci) {
        if (!DynamicCrosshairCompat.isArmed()) {
            return;
        }

        MatrixStack matrices = context.getMatrices();
        matrices.push();

        Matrix4f top = matrices.peek().getPositionMatrix();
        top.mul(new Matrix4f(top).invert());
    }

    @Inject(method = "draw", at = @At("RETURN"), require = 0, remap = false)
    private static void xbob$afterDraw(DrawContext context, CallbackInfo ci) {
        if (!DynamicCrosshairCompat.isArmed()) {
            return;
        }

        context.getMatrices().pop();
    }
}
