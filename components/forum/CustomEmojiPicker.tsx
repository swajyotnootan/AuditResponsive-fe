import {
  EmojiPicker,
  EmojiType,
} from "@softwhere-uz/react-native-emoji-keyboard";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Popable } from "react-native-popable";

interface CustomEmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export default function CustomEmojiPicker({
  onPick,
  onClose,
}: CustomEmojiPickerProps) {
  return (
    <View style={{ maxWidth: 360, alignSelf: "center", maxHeight: 500 }}>
      <EmojiPicker.Root
        onEmojiSelect={(emoji: EmojiType) => onPick(emoji.emoji)}
      >
        <EmojiPicker.Viewport>
          <EmojiPicker.List
            components={{
              Emoji: ({ emoji, onPress }: any) => (
                <Popable action="hover" content={emoji.name}>
                  <Pressable onPress={onPress}>
                    <Text style={{ fontSize: 24 }}>{emoji.emoji}</Text>
                  </Pressable>
                </Popable>
              ),
            }}
          />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
    </View>
  );
}
