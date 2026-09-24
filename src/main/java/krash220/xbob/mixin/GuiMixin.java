package krash220.xbob.mixin;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import com.mojang.blaze3d.vertex.PoseStack;

import krash220.xbob.MainMod;
import krash220.xbob.game.api.DynamicCrosshairCompat;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.resources.ResourceLocation;

@Mixin(Gui.class)
public class GuiMixin {

    @Redirect(method = "renderCrosshair", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V", ordinal = 1))
    private void xbob$indicatorFull(GuiGraphics graphics, ResourceLocation texture, int x, int y, int width, int height) {
        xbob$draw(graphics, texture, x, y, width, height);
    }

    @Redirect(method = "renderCrosshair", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V", ordinal = 2))
    private void xbob$indicatorBackground(GuiGraphics graphics, ResourceLocation texture, int x, int y, int width, int height) {
        xbob$draw(graphics, texture, x, y, width, height);
    }

    @Redirect(method = "renderCrosshair", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIIIIIII)V", ordinal = 0))
    private void xbob$indicatorProgress(GuiGraphics graphics, ResourceLocation texture, int u0, int v0, int u1, int v1, int x, int y, int width, int height) {
        xbob$draw9(graphics, texture, u0, v0, u1, v1, x, y, width, height);
    }

    private void xbob$draw(GuiGraphics graphics, ResourceLocation texture, int x, int y, int width, int height) {
        PoseStack pose = graphics.pose();
        boolean handle = DynamicCrosshairCompat.shouldHandleCrosshair();

        if (handle) {
            MainMod.preDynamicCrosshair(pose);
        }

        graphics.blitSprite(texture, x, y, width, height);

        if (handle) {
            MainMod.postDynamicCrosshair(pose);
        }
    }

    private void xbob$draw9(GuiGraphics graphics, ResourceLocation texture, int u0, int v0, int u1, int v1, int x, int y, int width, int height) {
        PoseStack pose = graphics.pose();
        boolean handle = DynamicCrosshairCompat.shouldHandleCrosshair();

        if (handle) {
            MainMod.preDynamicCrosshair(pose);
        }

        graphics.blitSprite(texture, u0, v0, u1, v1, x, y, width, height);

        if (handle) {
            MainMod.postDynamicCrosshair(pose);
        }
    }
}
