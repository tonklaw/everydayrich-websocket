// Chat theme colors
export const CHAT_THEMES = [
  {
    name: "Default",
    primary: "bg-emerald-500 dark:bg-emerald-700 text-white",
    secondary: "bg-gray-200 dark:bg-gray-700 text-black dark:text-white",
    hoverPrimary: "hover:bg-emerald-600 dark:hover:bg-emerald-800",
    hoverSecondary: "hover:bg-gray-300 dark:hover:bg-gray-800",
  },
  {
    name: "Blue",
    primary: "bg-blue-500 dark:bg-blue-700 text-white",
    secondary: "bg-blue-100 dark:bg-blue-900 text-black dark:text-white",
    hoverPrimary: "hover:bg-blue-600 dark:hover:bg-blue-800",
    hoverSecondary: "hover:bg-blue-200 dark:hover:bg-blue-800",
  },
  {
    name: "Purple",
    primary: "bg-purple-500 dark:bg-purple-700 text-white",
    secondary: "bg-purple-100 dark:bg-purple-900 text-black dark:text-white",
    hoverPrimary: "hover:bg-purple-600 dark:hover:bg-purple-800",
    hoverSecondary: "hover:bg-purple-200 dark:hover:bg-purple-800",
  },
  {
    name: "Pink",
    primary: "bg-pink-500 dark:bg-pink-700 text-white",
    secondary: "bg-pink-100 dark:bg-pink-900 text-black dark:text-white",
    hoverPrimary: "hover:bg-pink-600 dark:hover:bg-pink-800",
    hoverSecondary: "hover:bg-pink-200 dark:hover:bg-pink-800",
  },
  {
    name: "Orange",
    primary: "bg-orange-500 dark:bg-orange-700 text-white",
    secondary: "bg-orange-100 dark:bg-orange-900 text-black dark:text-white",
    hoverPrimary: "hover:bg-orange-600 dark:hover:bg-orange-800",
    hoverSecondary: "hover:bg-orange-200 dark:hover:bg-orange-800",
  },
  {
    name: "Red",
    primary: "bg-red-500 dark:bg-red-700 text-white",
    secondary: "bg-red-100 dark:bg-red-900 text-black dark:text-white",
    hoverPrimary: "hover:bg-red-600 dark:hover:bg-red-800",
    hoverSecondary: "hover:bg-red-200 dark:hover:bg-red-800",
  },
  {
    name: "Yellow",
    primary: "bg-yellow-500 dark:bg-yellow-700 text-white",
    secondary: "bg-yellow-100 dark:bg-yellow-900 text-black dark:text-white",
    hoverPrimary: "hover:bg-yellow-600 dark:hover:bg-yellow-800",
    hoverSecondary: "hover:bg-yellow-200 dark:hover:bg-yellow-800",
  },
  {
    name: "Teal",
    primary: "bg-teal-500 dark:bg-teal-700 text-white",
    secondary: "bg-teal-100 dark:bg-teal-900 text-black dark:text-white",
    hoverPrimary: "hover:bg-teal-600 dark:hover:bg-teal-800",
    hoverSecondary: "hover:bg-teal-200 dark:hover:bg-teal-800",
  },
];

export type ChatTheme = {
  name: string;
  primary: string;
  secondary: string;
  hoverPrimary: string;
  hoverSecondary: string;
};
