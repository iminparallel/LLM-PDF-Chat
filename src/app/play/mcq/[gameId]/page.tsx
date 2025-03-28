import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import MCQ from "@/components/MCQ";
import { redirect } from "next/navigation";
import * as React from "react";

type Params = Promise<{ gameId: any }>;

export default async function MCQPage({ params }: { params: Params }) {
  //console.log(typeof params, params, params instanceof Promise);
  const { gameId } = await params;
  //console.log("awaited params", gameId);

  const session: any = await auth();

  if (!session?.user) {
    return redirect("/");
  }
  const game = await db.game.findUnique({
    where: {
      id: gameId,
    },
    include: {
      questions: {
        select: {
          id: true,
          question: true,
          options: true,
        },
      },
    },
  });
  if (!game) {
    return redirect("/quiz");
  }
  return (
    <main className="flex relative items-center justify-center min-h-screen bg-black">
      <MCQ key={game.id} game={game} />{" "}
    </main>
  );
}
