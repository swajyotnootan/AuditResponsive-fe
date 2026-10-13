import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useTodayWorkPopup } from "../../../components/context/TodayWorkPopupContext";

export default function TodayWorkPage() {
  const { open } = useTodayWorkPopup();
  const router = useRouter();

  useEffect(() => {
    open(0);
    router.back();
  }, []);

  return <View />;
}
