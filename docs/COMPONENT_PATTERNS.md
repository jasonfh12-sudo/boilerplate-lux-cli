# Component Patterns for AI

Quick reference guide for using shadcn/ui components and common patterns.

---

## Pre-Installed Components

This boilerplate includes 19 shadcn/ui components ready to use:

- `Button` - Actions and CTAs
- `Input` - Text input fields
- `Textarea` - Multi-line text
- `Select` - Dropdowns
- `Checkbox` - Boolean options
- `Switch` - Toggle switches
- `Label` - Form labels
- `Card` - Content containers
- `Table` - Data tables
- `Badge` - Status indicators
- `Avatar` - User images
- `Dialog` - Modals
- `Dropdown Menu` - Action menus
- `Tabs` - Content sections
- `Toast` - Notifications
- `Skeleton` - Loading placeholders
- `Form` - Form validation

---

## Common Patterns

### 1. Form with Validation

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function UserForm() {
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/user", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
      }),
    });

    if (res.ok) {
      toast({ title: "Success!", description: "User created" });
    } else {
      toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 2. Data Table with Actions

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

export function UsersTable({ users }: { users: User[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 3. Confirmation Dialog

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteConfirm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the item.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Loading State

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function UserCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
```

### 5. Tabs Navigation

```typescript
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsTabs() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <Card>
          <CardContent className="pt-6">
            <p>General settings</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="security">
        <Card>
          <CardContent className="pt-6">
            <p>Security settings</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="notifications">
        <Card>
          <CardContent className="pt-6">
            <p>Notification settings</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
```

### 6. Status Badge

```typescript
import { Badge } from "@/components/ui/badge";

type Status = "active" | "inactive" | "pending";

export function StatusBadge({ status }: { status: Status }) {
  const variants: Record<Status, "default" | "secondary" | "destructive"> = {
    active: "default",
    inactive: "secondary",
    pending: "destructive",
  };

  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
```

### 7. User Avatar

```typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserAvatar({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Avatar>
      <AvatarImage src={image} alt={name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
```

### 8. Settings Toggle

```typescript
"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

export function SettingToggle({
  title,
  description,
  defaultChecked,
  onToggle,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
  onToggle?: (checked: boolean) => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div className="space-y-0.5">
          <Label>{title}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
          defaultChecked={defaultChecked}
          onCheckedChange={onToggle}
        />
      </CardContent>
    </Card>
  );
}
```

---

## Layout Patterns

### Page Container

```typescript
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {children}
      </div>
    </div>
  );
}
```

### Page Header

```typescript
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
```

---

## Color System

Use Tailwind's utility classes for consistent colors:

```typescript
// Background
className="bg-background"         // Page background
className="bg-card"               // Card background
className="bg-muted"              // Subtle background

// Text
className="text-foreground"       // Main text
className="text-muted-foreground" // Secondary text
className="text-destructive"      // Error text

// Borders
className="border border-border"  // Standard border

// Buttons
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Danger</Button>
```

---

## Responsive Design

Use Tailwind's responsive classes:

```typescript
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Stacks on mobile, 2 cols on tablet, 3 cols on desktop */}
</div>

<div className="flex flex-col md:flex-row gap-4">
  {/* Column on mobile, row on tablet+ */}
</div>

<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive text sizes */}
</div>
```

---

## Examples

See live examples:
- `/examples/dashboard` - Dashboard with stats and tables
- `/examples/table` - Data table with search and filters
- `/examples/form` - Form with validation

---

## Best Practices

1. **Use semantic HTML** - Proper heading hierarchy, labels for inputs
2. **Include loading states** - Use Skeleton components
3. **Handle errors gracefully** - Show toast notifications
4. **Make it accessible** - All shadcn components are accessible by default
5. **Be responsive** - Use Tailwind's responsive utilities
6. **Keep it simple** - Don't over-engineer, use patterns above

---

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com) - Component primitives
- [Lucide Icons](https://lucide.dev) - Icon library
