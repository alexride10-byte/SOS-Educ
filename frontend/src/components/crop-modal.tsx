// Apercu + recadrage manuel local du ticket (expo-image-manipulator, aucun reseau).
// L'original est conserve ; seule l'image validee est lue par la reconnaissance locale.
import { useRef, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Modal, PanResponder, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PickedImage } from "@/src/lib/image-picker";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Rect = { x: number; y: number; w: number; h: number };
type Corner = "tl" | "tr" | "bl" | "br";
const MIN = 48;

export function CropModal(props: {
  image: PickedImage | null;
  onCancel: () => void;
  onValidated: (validated: PickedImage, original: PickedImage) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const rectRef = useRef<Rect | null>(null);
  rectRef.current = rect;

  const img = props.image;
  const iw = img?.width || 1;
  const ih = img?.height || 1;
  const scale = box ? Math.min(box.w / iw, box.h / ih) : 1;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = box ? (box.w - dw) / 2 : 0;
  const oy = box ? (box.h - dh) / 2 : 0;
  const bounds = { x0: ox, y0: oy, x1: ox + dw, y1: oy + dh };
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
    const s = Math.min(width / iw, height / ih);
    const w = iw * s;
    const h = ih * s;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    setRect({ x: x + w * 0.05, y: y + h * 0.05, w: w * 0.9, h: h * 0.9 });
  };

  const makeResponder = (corner: Corner) => {
    let start: Rect | null = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start = rectRef.current;
      },
      onPanResponderMove: (_, g) => {
        if (!start) return;
        const b = boundsRef.current;
        let { x, y, w, h } = start;
        const right = x + w;
        const bottom = y + h;
        if (corner === "tl" || corner === "bl") x = Math.min(Math.max(b.x0, start.x + g.dx), right - MIN);
        if (corner === "tl" || corner === "tr") y = Math.min(Math.max(b.y0, start.y + g.dy), bottom - MIN);
        const nr = corner === "tr" || corner === "br" ? Math.max(Math.min(b.x1, right + g.dx), x + MIN) : right;
        const nb = corner === "bl" || corner === "br" ? Math.max(Math.min(b.y1, bottom + g.dy), y + MIN) : bottom;
        w = nr - x;
        h = nb - y;
        setRect({ x, y, w, h });
      },
    });
  };
  const responders = useRef({ tl: makeResponder("tl"), tr: makeResponder("tr"), bl: makeResponder("bl"), br: makeResponder("br") }).current;

  const validate = async (crop: boolean) => {
    if (!img) return;
    if (!crop || !rect) {
      props.onValidated(img, img);
      return;
    }
    setBusy(true);
    try {
      const originX = Math.max(0, Math.round((rect.x - ox) / scale));
      const originY = Math.max(0, Math.round((rect.y - oy) / scale));
      const width = Math.min(iw - originX, Math.round(rect.w / scale));
      const height = Math.min(ih - originY, Math.round(rect.h / scale));
      const ctx = ImageManipulator.manipulate(img.uri).crop({ originX, originY, width, height });
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      props.onValidated(
        { uri: saved.uri, base64: "", mimeType: "image/jpeg", width: saved.width, height: saved.height },
        img,
      );
    } catch {
      props.onValidated(img, img); // en cas d'echec, on garde l'original
    } finally {
      setBusy(false);
    }
  };

  const handle = (c: Corner, left: number, top: number) => (
    <View {...responders[c].panHandlers} testID={`crop-handle-${c}`} style={[styles.handleHit, { left: left - 22, top: top - 22 }]}>
      <View style={[styles.handle, { borderColor: colors.onBrand, backgroundColor: colors.brandPrimary }]} />
    </View>
  );

  return (
    <Modal visible={!!img} animationType="fade" onRequestClose={props.onCancel}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.sm }]} testID="crop-modal">
        <Text style={styles.title}>Aperçu du ticket</Text>
        <Text style={styles.help}>Ajustez les coins pour ne garder que le ticket, puis validez.</Text>
        <View style={styles.stage} onLayout={onLayout}>
          {img && box && (
            <Image source={{ uri: img.uri }} style={{ position: "absolute", left: ox, top: oy, width: dw, height: dh }} contentFit="fill" />
          )}
          {rect && (
            <>
              <View pointerEvents="none" style={[styles.shade, { left: ox, top: oy, width: dw, height: Math.max(0, rect.y - oy) }]} />
              <View pointerEvents="none" style={[styles.shade, { left: ox, top: rect.y + rect.h, width: dw, height: Math.max(0, oy + dh - rect.y - rect.h) }]} />
              <View pointerEvents="none" style={[styles.shade, { left: ox, top: rect.y, width: Math.max(0, rect.x - ox), height: rect.h }]} />
              <View pointerEvents="none" style={[styles.shade, { left: rect.x + rect.w, top: rect.y, width: Math.max(0, ox + dw - rect.x - rect.w), height: rect.h }]} />
              <View pointerEvents="none" style={[styles.frame, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]} />
              {handle("tl", rect.x, rect.y)}
              {handle("tr", rect.x + rect.w, rect.y)}
              {handle("bl", rect.x, rect.y + rect.h)}
              {handle("br", rect.x + rect.w, rect.y + rect.h)}
            </>
          )}
        </View>
        {busy ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ height: 56 }} />
        ) : (
          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={props.onCancel} testID="crop-cancel">
              <Text style={styles.secondaryText}>Annuler</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => validate(false)} testID="crop-skip">
              <Text style={styles.secondaryText}>Sans recadrer</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={() => validate(true)} testID="crop-validate">
              <Text style={styles.primaryText}>Valider</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: "#000000", paddingHorizontal: spacing.lg },
  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  help: { color: "#CBD5E1", fontSize: 13, marginTop: 4, marginBottom: spacing.md },
  stage: { flex: 1, overflow: "hidden" },
  shade: { position: "absolute", backgroundColor: "rgba(0,0,0,0.6)" },
  frame: { position: "absolute", borderWidth: 2, borderColor: colors.brandSecondary },
  handleHit: { position: "absolute", width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  handle: { width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  primary: { flex: 1, height: 56, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.onBrand, fontWeight: "700", fontSize: 15 },
  secondary: { flex: 1, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: "#475569", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
}));
