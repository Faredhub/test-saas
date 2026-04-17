import { getBlogPosts, getBlogCategories } from "@/lib/actions/website";
import { BlogClient } from "./blog-client";

export const metadata = { title: "Blog" };

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getBlogPosts(),
    getBlogCategories(),
  ]);

  return <BlogClient initialPosts={posts} categories={categories} />;
}
