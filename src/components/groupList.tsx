// app/components/groupList.tsx
"use client";
interface GroupProps {
  groups: Group[];
  username: string;
  onSelectGroup: (groupName: string) => void;
  selectedGroup: string;
  onJoinGroup: (groupName: string) => void;
}

interface Group {
  name: string;
  type: "public" | "private";
  members: string[];
}

export default function GroupList({
  groups,
  username,
  onSelectGroup,
  selectedGroup,
  onJoinGroup,
}: GroupProps) {
  // Filter groups to show public groups and private groups the user is a member of
  const availableGroups = groups.filter(group => 
    group.type === "public" || group.members.includes(username)
  );

  return (
    <div className="mb-4">
      <h3 className="font-medium text-sm text-gray-700 mb-2">Groups</h3>
      <div className="flex flex-col gap-1">
        {availableGroups.map((group) => {
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
                <span className="ml-2 text-xs text-gray-500">
                  {group.type === "private" ? "🔒" : ""}
                </span>
              </button>
              
              {!isMember && group.type === "public" && (
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