import { Api, type MessageSender, type Port } from "~/api";

Api.initialize({
  handleRequests: true,
  handleConnection: true,
  context: "background",
});
