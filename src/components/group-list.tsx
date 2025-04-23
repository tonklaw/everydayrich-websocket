"use client";

import { Group } from "@/type/group";

interface GroupProps {
  groups: Group[];
  username: string;
  onSelectGroup: (groupName: string) => void;
  selectedGroup: string;
  onJoinGroup: (groupName: string) => void;
}

export default function GroupList({
  groups,
  username,
  onSelectGroup,
  selectedGroup,
  onJoinGroup,
}: GroupProps) {
  return (
    <div className="mb-4">
      <h3 className="font-medium text-sm text-gray-700 mb-2">Groups</h3>
      <div className="flex flex-col gap-1">
        {groups.map((group) => {
          const isMember = group.members.includes(username);

          return (
            <div key={group.name} className="flex items-center">
              <button
                onClick={() => onSelectGroup(group.name)}
                className={`flex-1 text-left px-3 py-1.5 rounded text-sm ${
                  selectedGroup === group.name
                    ? "bg-purple-100 text-purple-800"
                    : "hover:bg-gray-100"
                }`}
              >
                # {group.name}
              </button>

              {!isMember && (
                <button
                  onClick={() => onJoinGroup(group.name)}
                  className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Join
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
