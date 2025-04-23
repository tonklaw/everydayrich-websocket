import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Label } from "@radix-ui/react-label";
import { Button } from "../ui/button";
import { DialogHeader, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";

export function NicknameDialog({
  showNicknameDialog,
  setShowNicknameDialog,
  nicknameTarget,
  setNicknameInput,
  nicknameInput,
  saveNickname,
  getInitials,
}: {
  showNicknameDialog: boolean;
  setShowNicknameDialog: (show: boolean) => void;
  nicknameTarget: string;
  setNicknameInput: (nickname: string) => void;
  nicknameInput: string;
  saveNickname: () => void;
  getInitials: (name: string) => string;
}) {
  return (
    <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Set Custom Name</DialogTitle>
          <DialogDescription>
            Set a custom name for{" "}
            <span className="font-medium">{nicknameTarget}</span>. Only you will
            see this name, and others will still see their original username.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Custom Name</Label>
            <Input
              id="nickname"
              placeholder="Enter custom name"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to remove the custom name and revert to their original
              username
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {getInitials(nicknameTarget)}
                </AvatarFallback>
              </Avatar>
              <div className="font-medium">Preview:</div>
            </div>
            <div className="pl-8">
              {nicknameInput ? (
                <div>
                  <div className="font-medium">{nicknameInput}</div>
                  <div className="text-xs text-muted-foreground">
                    Original: {nicknameTarget}
                  </div>
                </div>
              ) : (
                <div className="font-medium">{nicknameTarget}</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowNicknameDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={saveNickname}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
