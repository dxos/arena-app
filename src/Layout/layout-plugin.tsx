import {
  IntentResolverProvides,
  PluginDefinition,
  Surface,
  SurfaceProvides,
  useIntent,
} from "@dxos/app-framework";
import { useClient } from "@dxos/react-client";
import { match as pathMatch } from "path-to-regexp";
import React, { PropsWithChildren, useCallback, useEffect } from "react";
import { atom } from "signia";
import { match } from "ts-pattern";
import { RoomManagerIntent, roomManagerIntent } from "../RoomManager/room-manager-plugin";
import { mkIntentBuilder } from "../lib";
import { Layout } from "./components/Layout";

// --- Layout Constants and Metadata -------------------------------------------
export const LayoutPluginMeta = { id: "layout", name: "Layout Plugin" };

// --- Layout State ------------------------------------------------------------
type ViewState =
  | { type: "uninitialized" }
  | { type: "lobby" }
  | { type: "create-invitation" }
  | { type: "invitation"; invitationId: string }
  | { type: "game"; gameId: string }
  | { type: "choose-room" }
  | { type: "not-found" };

export const layoutStateAtom = atom<ViewState>("layout", { type: "lobby" });

// --- Layout Intents ---------------------------------------------------------
const actionPrefix = "@arena.dxos.org/layout";

export enum LayoutIntent {
  OPEN_LOBBY = `${actionPrefix}/open-lobby`,
  OPEN_CREATE_INVITATION = `${actionPrefix}/navigate-to-create-invitation`,
  OPEN_INVITATION = `${actionPrefix}/open-invitation`,
  OPEN_GAME = `${actionPrefix}/open-game`,
  CHOOSE_ROOM = `${actionPrefix}/choose-room`,
  PRESENT_404 = `${actionPrefix}/present-404`,
}

export namespace LayoutIntent {
  export type OpenLobby = undefined;
  export type NavigateToCreateInvitation = undefined;
  export type OpenInvitation = { invitationId: string };
  export type OpenGame = { gameId: string };
  export type ChooseRoom = undefined;
  export type Present404 = undefined;
}

type LayoutIntents = {
  [LayoutIntent.OPEN_LOBBY]: LayoutIntent.OpenLobby;
  [LayoutIntent.OPEN_CREATE_INVITATION]: LayoutIntent.NavigateToCreateInvitation;
  [LayoutIntent.OPEN_INVITATION]: LayoutIntent.OpenInvitation;
  [LayoutIntent.OPEN_GAME]: LayoutIntent.OpenGame;
  [LayoutIntent.CHOOSE_ROOM]: LayoutIntent.ChooseRoom;
  [LayoutIntent.PRESENT_404]: LayoutIntent.Present404;
};

export const layoutIntent = mkIntentBuilder<LayoutIntents>(LayoutPluginMeta.id);

// --- App Routing -------------------------------------------------------------
const appPaths = [
  ["lobby", "/"],
  ["create-invitation", "/create-invitation"],
  ["invitation", "/play-with-me/:id"],
  ["game", "/game/:id"],
  ["choose-room", "/choose-room"],
] as const;

// --- Plugin Definition ------------------------------------------------------
type LayoutPluginProvidesCapabilities = IntentResolverProvides & SurfaceProvides;

export default function LayoutPlugin(): PluginDefinition<LayoutPluginProvidesCapabilities> {
  return {
    meta: LayoutPluginMeta,

    provides: {
      context: (props: PropsWithChildren) => <>{props.children}</>, // TODO(Zan): Add MOSAIC root?

      intent: {
        resolver(intent, _plugins) {
          console.log("Layout Intent Resolver", intent);

          return match(intent.action as LayoutIntent)
            .with(LayoutIntent.OPEN_CREATE_INVITATION, () => {
              layoutStateAtom.set({ type: "create-invitation" });
              return true;
            })
            .with(LayoutIntent.OPEN_INVITATION, () => {
              layoutStateAtom.set({ type: "invitation", invitationId: intent.data.invitationId });
              return true;
            })
            .with(LayoutIntent.OPEN_LOBBY, () => {
              layoutStateAtom.set({ type: "lobby" });
              return true;
            })
            .with(LayoutIntent.OPEN_GAME, () => {
              layoutStateAtom.set({ type: "game", gameId: intent.data.gameId });
              return true;
            })
            .with(LayoutIntent.CHOOSE_ROOM, () => {
              layoutStateAtom.set({ type: "choose-room" });
              return true;
            })
            .with(LayoutIntent.PRESENT_404, () => {
              layoutStateAtom.set({ type: "not-found" });
              return true;
            })
            .exhaustive();
        },
      },
      surface: { component: ({ role }) => (role === "main" ? <Layout /> : null) },
      root: () => {
        const { dispatch } = useIntent();

        const client = useClient();

        const handleNavigation = useCallback(() => {
          console.log("handleNavigation", window.location);
          const path = window.location.pathname;

          const search = new URLSearchParams(window.location.search);

          if (search.has("spaceInvitationCode")) {
            const invitationCode = search.get("spaceInvitationCode")!;

            console.log("Joining space with invitation code", invitationCode);

            client.shell.joinSpace({ invitationCode }).then((joinSpaceResult) => {
              console.log("Join space result", joinSpaceResult);
              const space = joinSpaceResult.space;

              if (space) {
                dispatch(roomManagerIntent(RoomManagerIntent.JOIN_ROOM, { spaceKey: space.key }));
              }
            });
          }

          // Iterate through app paths and find the first match.
          const foundMatch = appPaths
            .map(([route, appPath]) => {
              const matcher = pathMatch(appPath, { decode: decodeURIComponent });
              const matchResult = matcher(path);

              return [route, matchResult] as const;
            })
            .filter(([, matchResult]) => matchResult !== false);

          console.log("Route match result", foundMatch);

          if (foundMatch.length > 0 && foundMatch[0][1] !== false) {
            const [route, { params }] = foundMatch[0];
            const { id } = params as any as { id: string };

            // TODO(Zan): Make pattern matching more robust by matching on route and params.
            match(route)
              .with("lobby", () => dispatch(layoutIntent(LayoutIntent.OPEN_LOBBY)))
              .with("create-invitation", () =>
                dispatch(layoutIntent(LayoutIntent.OPEN_CREATE_INVITATION))
              )
              .with("invitation", () =>
                dispatch(layoutIntent(LayoutIntent.OPEN_INVITATION, { invitationId: id }))
              )
              .with("game", () => dispatch(layoutIntent(LayoutIntent.OPEN_GAME, { gameId: id })))
              .with("choose-room", () => dispatch(layoutIntent(LayoutIntent.CHOOSE_ROOM)))
              .exhaustive();
          } else {
            dispatch(layoutIntent(LayoutIntent.PRESENT_404));
          }
        }, [client, dispatch]);

        // Update selection based on browser navigation.
        useEffect(() => {
          const originalPushState = window.history.pushState;

          window.history.pushState = function (state, title, url) {
            originalPushState.call(window.history, state, title, url);
            handleNavigation();
          };

          const originalReplaceState = window.history.replaceState;

          window.history.replaceState = function (state, title, url) {
            originalReplaceState.call(window.history, state, title, url);
            handleNavigation();
          };

          window.addEventListener("popstate", handleNavigation);

          return () => {
            window.removeEventListener("popstate", handleNavigation);
            // Restore the original functions
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
          };
        }, [handleNavigation]);

        useEffect(() => {
          handleNavigation();
        }, [handleNavigation]);

        // Note: Here is where we can inject data into the rendered surface.
        return <Surface role="main" />;
      },
    },
  };
}
