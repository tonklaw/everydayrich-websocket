import { Checkbox } from "@radix-ui/react-checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function CreateGroupDialog({
  showCreateGroup,
  setShowCreateGroup,
  clients,
  groupName,
  setGroupName,
  selectedMembers,
  handleToggleMember,
  handleCreateGroup,
}: {
  showCreateGroup: boolean;
  setShowCreateGroup: (show: boolean) => void;
  clients: string[];
  groupName: string;
  setGroupName: (name: string) => void;
  selectedMembers: string[];
  handleToggleMember: (member: string) => void;
  handleCreateGroup: () => void;
}) {
  return (
    <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a group chat where everyone can read messages, but only
            members can send messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Members</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
              {clients.map((client) => (
                <div key={client} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${client}`}
                    checked={selectedMembers.includes(client)}
                    onCheckedChange={() => handleToggleMember(client)}
                  />
                  <Label htmlFor={`member-${client}`} className="text-sm">
                    {client}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
