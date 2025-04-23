import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { ModeToggle } from "../ui/mode-toggle";

export function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  error,
  handleLogin,
}: {
  username: string;
  setUsername: (username: string) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string | null;
  handleLogin: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-6 pt-8 px-6">
          <div className="flex justify-end mb-2">
            <ModeToggle />
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome Back
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <Button
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-white"
              size="lg"
              onClick={handleLogin}
            >
              Sign In / Register
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
