import { CHAT_THEMES } from "@/constants/chat-theme";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "../ui/dialog";

export function ThemeDialog({
  selectedTheme,
  setSelectedTheme,
  showThemeDialog,
  setShowThemeDialog,
  saveTheme,
}: {
  saveTheme: () => void;
  selectedTheme: number;
  setSelectedTheme: (theme: number) => void;
  showThemeDialog: boolean;
  setShowThemeDialog: (show: boolean) => void;
}) {
  return (
    <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Chat Theme</DialogTitle>
          <DialogDescription>
            Choose a color theme for this chat
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-4 gap-3">
            {CHAT_THEMES.map((theme, index) => (
              <Button
                key={index}
                variant="outline"
                className={`h-12 w-full p-0 overflow-hidden ${selectedTheme === index ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedTheme(index)}
              >
                <div className="flex flex-col w-full h-full">
                  <div className={`h-1/2 w-full ${theme.primary}`}></div>
                  <div className={`h-1/2 w-full ${theme.secondary}`}></div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowThemeDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={saveTheme}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Apply Theme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
