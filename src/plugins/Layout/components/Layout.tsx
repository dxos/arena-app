import { AnimatePresence } from "framer-motion";
import React from "react";
import { useValue } from "signia-react";
import { P, match } from "ts-pattern";

import { Surface } from "@dxos/app-framework";

import { Fade } from "$ui/Fade";
import { ChooseRoom } from "../../RoomManager/components/ChooseRoom";
import { layoutStateAtom } from "../layout-plugin";
import { Lobby } from "./Lobby";
import { Nav } from "./Nav";
import { NotFound } from "./NotFound";
import { RoomIndicator } from "./RoomIndicator";

export const Layout = () => {
  const layoutState = useValue(layoutStateAtom);

  const layoutStateToView = (state: typeof layoutState) =>
    match(state)
      .with({ type: "uninitialized" }, () => null)
      .with({ type: "lobby" }, () => <Lobby />)
      .with({ type: "create-invitation" }, () => <Surface role="create-invitation" />)
      .with({ type: "invitation", invitationId: P.select("id") }, ({ id }) => (
        <Surface role="invitation" data={{ id }} />
      ))
      .with({ type: "game" }, ({ gameId, instanceId }) => (
        <Surface role="game" data={{ gameId, instanceId }} />
      ))
      .with({ type: "not-found" }, () => <NotFound />)
      .with({ type: "choose-room" }, () => <ChooseRoom />)
      .with({ type: "manage-room" }, () => <Surface role="room-manager" />)
      .exhaustive();

  const FadeView = React.useMemo(
    () => () => <Fade>{layoutStateToView(layoutState)}</Fade>,
    [layoutState],
  );

  return (
    <div className="absolute inset-0 overflow-hidden flex justify-center">
      <div className={[
        "h-full w-[900px] text-zinc-900 dark:text-zinc-50 dark:bg-zinc-900",
        "bg-no-repeat bg-[url('/images/chess2.png')] bg-cover"
      ].join(' ')}>
        <Nav />
        <RoomIndicator />
        <AnimatePresence>
          <FadeView />
        </AnimatePresence>
      </div>
    </div>
  );
};
