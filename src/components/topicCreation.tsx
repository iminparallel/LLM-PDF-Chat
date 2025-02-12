"use client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axios, { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { z } from "zod";
const schema = z.object({});
type Input = z.infer<typeof schema>;

const TopicCreationButton = () => {
  const [created, setCreated] = useState(true);
  const { mutate: getTopics, status } = useMutation({
    mutationFn: async (/*{ amount, topic, type }: Input*/) => {
      const response = await axios.post("/api/topics");
      return response.data;
    },
  });

  const { toast } = useToast();

  const form = useForm<Input>();

  const onSubmit = async (data: Input) => {
    console.log(data);
    setCreated(false);
    getTopics(undefined, {
      onError: (error) => {
        toast({
          title: "Error",
          description: "Something went wrong. Could not Create topics!",
          variant: "destructive",
        });
        setCreated(true);
      },
      onSuccess: () => {
        setTimeout(() => {
          toast({
            title: "Success",
            description: "Topics created succesfully!",
            variant: "default",
          });
          setCreated(true);
        }, 2000);
      },
    });
  };
  form.watch();

  return (
    <Card className="border-none bg-black text-white">
      {!created ? (
        <CardContent>
          <CardDescription> Wait a while! </CardDescription>
        </CardContent>
      ) : (
        <form
          className="flex w-full p-3 items-center justify-center"
          //className="flex  grid-cols-3 flex-row w-full "
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Button disabled={status === "pending"} type="submit">
            Generate Topics
          </Button>
        </form>
      )}
    </Card>
  );
};

export { TopicCreationButton };
