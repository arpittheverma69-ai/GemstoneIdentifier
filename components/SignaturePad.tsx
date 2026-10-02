import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  StyleSheet,
  View,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { BorderRadius } from "@/constants/theme";
import { Buffer } from "buffer";

export interface SignaturePath {
  id: number;
  points: { x: number; y: number }[];
}

export interface SignaturePadHandle {
  clearSignature: () => void;
  readSignature: () => Promise<string | null>;
}

interface SignaturePadProps {
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  exportBackgroundColor?: string;
  onOK?: (signature: string) => void;
  onEmpty?: () => void;
  onClear?: () => void;
  style?: any;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  (
    {
      strokeColor = "#0F172A",
      strokeWidth = 3,
      backgroundColor = "#FFFFFF",
      exportBackgroundColor,
      onOK,
      onEmpty,
      onClear,
      style,
    },
    ref,
  ) => {
    const [paths, setPaths] = useState<SignaturePath[]>([]);
    const [dimensions, setDimensions] = useState<{
      width: number;
      height: number;
    }>({ width: 0, height: 0 });

    const addPointToCurrentPath = (point: { x: number; y: number }) => {
      setPaths((prev) => {
        if (prev.length === 0) {
          return prev;
        }
        const next = [...prev];
        const currentPath = next[next.length - 1];
        next[next.length - 1] = {
          ...currentPath,
          points: [...currentPath.points, point],
        };
        return next;
      });
    };

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onStartShouldSetPanResponderCapture: () => true,
          onMoveShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponderCapture: () => true,
          onPanResponderGrant: (event: GestureResponderEvent) => {
            const { locationX, locationY } = event.nativeEvent;
            setPaths((prev) => [
              ...prev,
              {
                id: Date.now(),
                points: [{ x: locationX, y: locationY }],
              },
            ]);
          },
          onPanResponderMove: (event: GestureResponderEvent) => {
            const { locationX, locationY } = event.nativeEvent;
            addPointToCurrentPath({ x: locationX, y: locationY });
          },
          onPanResponderRelease: () => {
            // no-op; path already stored
          },
          onPanResponderTerminate: () => {
            // no-op
          },
        }),
      [],
    );

    const clearSignature = () => {
      setPaths([]);
      onClear?.();
    };

    const readSignature = async (): Promise<string | null> => {
      if (paths.length === 0) {
        onEmpty?.();
        return null;
      }

      if (dimensions.width === 0 || dimensions.height === 0) {
        onEmpty?.();
        return null;
      }

      try {
        const fillColor = exportBackgroundColor ?? backgroundColor;

        const svgPaths = paths
          .map((path) => {
            if (path.points.length === 0) {
              return "";
            }
            const d = path.points
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
              )
              .join(" ");
            return `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
          })
          .join("");

        const backgroundRect =
          fillColor &&
          fillColor !== "transparent" &&
          fillColor !== "rgba(0,0,0,0)"
            ? `<rect width="100%" height="100%" fill="${fillColor}" />`
            : "";

        const svg =
          `<?xml version="1.0" encoding="UTF-8"?>` +
          `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" preserveAspectRatio="none">` +
          `${backgroundRect}${svgPaths}</svg>`;

        const base64 = Buffer.from(svg, "utf-8").toString("base64");
        const dataUri = `data:image/svg+xml;base64,${base64}`;
        onOK?.(dataUri);
        return dataUri;
      } catch (error) {
        console.error("Signature capture failed", error);
        onEmpty?.();
        return null;
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        clearSignature,
        readSignature,
      }),
      [paths],
    );

    const renderPath = (path: SignaturePath) => {
      if (path.points.length === 0) {
        return null;
      }
      const d = path.points
        .map(
          (point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`,
        )
        .join(" ");
      return (
        <Path
          key={path.id}
          d={d}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    };

    const handleLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width !== dimensions.width || height !== dimensions.height) {
        setDimensions({ width, height });
      }
    };

    return (
      <View style={[styles.container, style]} onLayout={handleLayout}>
        <View
          style={[styles.canvasContainer, { backgroundColor }]}
          {...panResponder.panHandlers}
        >
          <Svg style={styles.svg}>{paths.map((path) => renderPath(path))}</Svg>
        </View>
      </View>
    );
  },
);

SignaturePad.displayName = "SignaturePad";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  canvasContainer: {
    flex: 1,
  },
  svg: {
    flex: 1,
  },
});

export default SignaturePad;
