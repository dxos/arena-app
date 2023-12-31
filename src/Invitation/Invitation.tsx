import { TypedObject, useQuery } from "@dxos/react-client/echo";
import { useIdentity } from "@dxos/react-client/halo";
import React, { useEffect } from "react";
import { Link } from "../Layout/components/Link";
import { useActiveRoom } from "../RoomManager/useActiveRoom";
import { Button } from "../UI/Buttons";
import { useIntent } from "@dxos/app-framework";
import { InvitationIntent, invitationIntent } from "./invitation-plugin";
import useClipboard from "../hooks/useClipboard";

const useJoinInvitation = (invitation: TypedObject | undefined) => {
  const identity = useIdentity();
  const { dispatch } = useIntent();

  useEffect(() => {
    if (!identity || !invitation) return;

    const identityKeyHex = identity.identityKey.toHex();

    if (invitation.creatorId !== identityKeyHex) {
      console.log("We are the second player");

      // We are the second player to join
      invitation.joiningPlayerId = identityKeyHex;
      invitation.finalised = true;

      dispatch(invitationIntent(InvitationIntent.CREATE_GAME, invitation as any));
    }
  }, [invitation, identity]);
};

function useRedirectToGame(finalised: boolean | undefined, newEntityId: string | undefined) {
  useEffect(() => {
    if (finalised && newEntityId) {
      window.history.pushState({}, "", `/game/${newEntityId}`);
    }
  }, [finalised, newEntityId]);
}

export const InvitationView = ({ id }: { id: string }) => {
  const space = useActiveRoom();
  const [invitation] = useQuery(space, { type: "invitation", invitationId: id });
  const identity = useIdentity();

  const { isCopied, copy } = useClipboard(window.location.href, { successDuration: 800 });

  useJoinInvitation(invitation);
  useRedirectToGame(invitation?.finalised, invitation?.newEntityId);

  const handleCancelInvitation = () => {
    if (!space || !invitation || !identity) return;
    if (identity.identityKey.toHex() !== invitation.creatorId) return;

    invitation.cancelled = true;
    window.history.pushState({}, "", "/");
  };

  if (!invitation) return null;

  if (invitation.cancelled)
    return (
      <div className="m-8">
        <div className="p-4 flex flex-col items-center gap-4">
          <p className="text-lg">This invitation has been cancelled by the creator.</p>
          <Link to="/">
            <Button aria-label="Back to lobby">Back to lobby</Button>
          </Link>
        </div>
      </div>
    );

  return (
    <div className="m-8">
      <div className="p-4 flex flex-col items-center gap-4">
        <p className="text-lg">
          The first person <strong>in your room</strong> who opens this link will enter the game.
        </p>
        <div className="flex flex-row items-center gap-2">
          <code>{window.location.href}</code>
          <Button aria-label="Copy invitation link" onClick={copy}>
            {isCopied ? "Copied ✅" : "Copy 📋"}
          </Button>
        </div>
        <Button onClick={handleCancelInvitation} aria-label="Cancel invitation" variant="danger">
          Cancel Invitation
        </Button>
      </div>
    </div>
  );
};
