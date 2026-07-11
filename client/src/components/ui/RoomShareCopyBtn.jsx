// RoomShareCopyBtn.jsx
import { ScriptCopyBtn } from "@/components/magicui/script-copy-btn";
import useRoomStore from "@/store/roomStore";

export function RoomShareCopyBtn() {
  const roomId = useRoomStore((s) => s.getRoomId()); // ✅ use derived getter
  if (!roomId) {
    return <p className="text-center text-red-400">No active room yet</p>;
  }

  const roomLink = `${window.location.origin}/lobby/${roomId}`;

  const customCommandMap = {
    "Room Code": roomId,
    "Room Link": roomLink,
  };

  return (
    <ScriptCopyBtn
      showMultiplePackageOptions={true}
      codeLanguage="text"
      lightTheme="nord"
      darkTheme="vitesse-dark"
      commandMap={customCommandMap}
    />
  );
}
