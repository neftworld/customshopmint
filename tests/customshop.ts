import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { Customshop } from "../target/types/customshop";

const TEST_DOMAIN = "nft.hedgehog.org";

describe("customshop", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.Customshop as Program<Customshop>;

  // it("Is initialized", async () => {
  //   // Add your test here.
  //   const tx = await program.methods.initialize().rpc();
  //   console.log("Your transaction signature", tx);
  // });

  it("Creates marker", async () => {
    const [markerPDA, _] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("marker"),
        anchor.utils.bytes.utf8.encode(TEST_DOMAIN),
      ],
      program.programId
    );

    const tx = await program.methods
      .createMarker(TEST_DOMAIN)
      .accounts({
        user: provider.wallet.publicKey,
        marker: markerPDA,
      })
      .rpc();
    console.log({ tx });

    expect((await program.account.marker.fetch(markerPDA)).created).to.equal(
      true
    );

    expect(
      (await program.account.marker.fetch(markerPDA)).authority.toBase58()
    ).to.equal(provider.wallet.publicKey.toBase58());
  });
});
