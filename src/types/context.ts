import { AuthTokenPayload } from "./auth";

export type Variables = {
  user?: AuthTokenPayload;
  csrfToken?: string;
};
