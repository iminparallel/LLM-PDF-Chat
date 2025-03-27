"use client";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
type Upload = {
  upload: string;
};

const milestoneSchema = z.object({
  upload: z.string().min(1),
});

type Input = z.infer<typeof milestoneSchema>;

const Delete = ({ upload }: Upload) => {
  const router = useRouter();
  const { toast } = useToast();

  const { mutate: deleteChat, status } = useMutation({
    mutationFn: async ({ upload }: Input) => {
      const response = await fetch("/api/upsert", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ upload }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Could not be deleted");
      }

      return await response.json();
    },
  });

  const form = useForm<Input>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      upload: upload || "",
    },
  });

  const onSubmit = async (data: Input) => {
    deleteChat(data, {
      onError: (error) => {
        console.log(error);
        toast({
          title: "Error",
          description: "Something went wrong. Could not Delete!",
          variant: "destructive",
        });
      },
      onSuccess: (data) => {
        setTimeout(() => {
          toast({
            title: "Success",
            description: "Upload deleted successfully!",
            variant: "default",
          });
          router.push(`/profile/${data.userId}`);
        }, 2000);
      },
    });
  };

  return (
    <div className="border-none ">
      <form className="flex flex-grow" onSubmit={form.handleSubmit(onSubmit)}>
        <Button
          disabled={status === "pending"}
          type="submit"
          onClick={() => {
            form.setValue("upload", upload);
          }}
        >
          <Trash2 />
        </Button>
      </form>
    </div>
  );
};

export default Delete;
