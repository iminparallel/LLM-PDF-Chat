import { auth } from "@/lib/auth";
import { signIn } from "@/lib/auth";
import { GithubSignIn } from "@/components/github-sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeAction } from "@/lib/executeAction";
import Link from "next/link";
import { redirect } from "next/navigation";
import ErrorToast from "@/components/ErrorToast";
import Image from "next/image";
import { Card /*CardContent, CardTitle*/ } from "@/components/ui/card";

const Page = async () => {
  const session = await auth();
  if (session) redirect("/");
  return (
    <main className="flex relative items-center justify-center min-h-screen bg-black">
      <Card
        className="flex flex-col gap-4 text-white bg-black border-gray-800 p-12 
                      h-[90vh] overflow-y-auto w-full max-w-md sm:max-w-lg lg:max-w-2xl mt-4 sm:mt-8"
      >
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/aiversety.jpg"
                alt="Aiversity Logo"
                width={75}
                height={25}
                className="rounded-lg shadow-md"
              />
            </Link>
            <small className="text-gray-300">
              Skim fast, automate retention!
            </small>
          </div>
          <ErrorToast />
          <div className="text-black">
            <GithubSignIn />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground bg-black text-white">
                  Or continue with email
                </span>
              </div>
            </div>
            <br />
            <form
              className="space-y-4"
              action={async (formData) => {
                "use server";
                await executeAction({
                  actionFn: async () => {
                    try {
                      await signIn("credentials", formData);
                    } catch {
                      redirect("/sign-in?error=1");
                    }
                  },
                });
              }}
            >
              <Input
                name="email"
                placeholder="Email"
                type="email"
                required
                autoComplete="email"
              />
              <Input
                name="password"
                placeholder="Password"
                type="password"
                required
                autoComplete="current-password"
              />
              <Button className="w-full" type="submit">
                Sign In
              </Button>
            </form>
          </div>
          <div className="text-center">
            <Button asChild variant="link">
              <Link className="text-white" href="/sign-up">
                Don&apos;t have an account? Sign up
              </Link>
            </Button>
          </div>

          <Card className="p-3 bg-black border-gray-900 text-gray-200 flex flex-col items-center gap-4 w-full max-w-md">
            <div>Upload your documents using the tooltip.</div>
            <Image
              src="/upload.png"
              alt="Upload"
              width={500}
              height={50}
              className="rounded-lg shadow-md"
            />

            <small>
              Connect Metamask to unlock Milestones and take personalized
              Quizzes!
            </small>
            <Image
              src="/Quiz.png"
              alt="Quiz"
              width={500}
              height={50}
              className="rounded-lg shadow-md"
            />

            <small>
              Claim Milestones to get refunds! Remember to complete within 7
              days.
            </small>
            <Image
              src="/claim.png"
              alt="Claim Milestones"
              width={500}
              height={50}
              className="rounded-lg shadow-md"
            />

            <Image
              src="/product.png"
              alt="Claim Milestones"
              width={500}
              height={50}
              className="rounded-lg shadow-md"
            />
            <small>Happy Skimming!</small>
          </Card>
        </div>
      </Card>
    </main>
  );
};

export default Page;
