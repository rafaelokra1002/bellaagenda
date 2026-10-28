import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}

export function Pagination({ page, pageCount, basePath, params }: Props) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const linkCls = "inline-flex h-10 items-center gap-1 rounded-full border border-line bg-white px-4 text-sm hover:bg-nude-soft";
  return (
    <nav className="mt-5 flex items-center justify-between" aria-label="Paginação">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkCls}>
          <ChevronLeft className="size-4" /> Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-cocoa-muted">
        Página {page} de {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(linkCls)}>
          Próxima <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
