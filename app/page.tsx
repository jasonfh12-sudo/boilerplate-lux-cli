import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Table, FileText, Github } from "lucide-react";

export default function Home() {
  const examples = [
    {
      title: "Dashboard",
      description: "Stats cards, charts, and activity feeds",
      href: "/examples/dashboard",
      icon: LayoutDashboard,
      color: "text-blue-500",
    },
    {
      title: "Data Table",
      description: "Sortable table with search and filters",
      href: "/examples/table",
      icon: Table,
      color: "text-green-500",
    },
    {
      title: "Forms",
      description: "Input validation and form patterns",
      href: "/examples/form",
      icon: FileText,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mb-4">
              Next.js 15 + shadcn/ui
            </Badge>
            <h1 className="text-5xl font-bold tracking-tight">
              Next.js Boilerplate
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Production-ready Next.js starter with shadcn/ui components, Tailwind CSS,
              and TypeScript. Perfect for AI-generated interfaces.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link href="/examples/dashboard">View Examples</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="h-5 w-5" />
                  GitHub
                </a>
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>shadcn/ui</CardTitle>
                <CardDescription>19 pre-installed components</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Beautiful, accessible components built with Radix UI and Tailwind CSS.
                  Ready to use in your projects.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>TypeScript</CardTitle>
                <CardDescription>Fully typed codebase</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  End-to-end type safety with TypeScript. Catch errors before they
                  reach production.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI-Ready</CardTitle>
                <CardDescription>Optimized for AI code generation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Clear patterns and examples for AI assistants to generate consistent,
                  high-quality code.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Examples */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Component Examples</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {examples.map((example) => (
                <Link key={example.href} href={example.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <example.icon className={`h-12 w-12 mb-2 ${example.color}`} />
                      <CardTitle>{example.title}</CardTitle>
                      <CardDescription>{example.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="w-full">
                        View Example →
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="pt-8 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              BUILT WITH
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                "Next.js 15",
                "React 19",
                "TypeScript",
                "Tailwind CSS 3",
                "shadcn/ui",
                "Radix UI",
                "Lucide Icons",
              ].map((tech) => (
                <Badge key={tech} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
