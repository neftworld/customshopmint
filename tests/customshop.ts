import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { Customshop } from "../target/types/customshop";

const TEST_DOMAIN_SHORT = "nft.hedgehog.org";

const TEST_DOMAIN_LONG = "nft.hedgehogasdljfalsdkjfhal.org";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("customshop", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.Customshop as Program<Customshop>;

  
  it("Creates marker", async () => {

    const keyPair = Keypair.generate()

    const result = await provider.connection.requestAirdrop(keyPair.publicKey, 2 * LAMPORTS_PER_SOL)

    await sleep(500)
    
    console.log({result})

    const [markerPDA, _] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("marker"),
        anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
      ],
      program.programId
    );

    const tx = await program.methods
      .createMarker(TEST_DOMAIN_LONG)
      .accounts({
        authority: provider.wallet.publicKey,
        user: keyPair.publicKey,
        marker: markerPDA,
      })
      .signers([keyPair])
      .rpc();
    console.log({ tx });

    expect((await program.account.marker.fetch(markerPDA)).created).to.equal(
      true
    );

    expect(
      (await program.account.marker.fetch(markerPDA)).authority.toBase58()
    ).to.equal(provider.wallet.publicKey.toBase58());

    expect(
      (await program.account.marker.fetch(markerPDA)).linkedWallet.toBase58()
    ).to.equal(keyPair.publicKey.toBase58());


    expect(
      (await program.account.marker.fetch(markerPDA)).domain
    ).to.equal(TEST_DOMAIN_LONG);


  });

  it("Updates marker owned", async () => {

    const keyPair = Keypair.generate()

    const result = await provider.connection.requestAirdrop(keyPair.publicKey, 2 * LAMPORTS_PER_SOL)

    await sleep(500)
    
    console.log({result})

    const [markerPDA, _] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("marker"),
        anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
      ],
      program.programId
    );


      /// ensure that the linked wallet starts off as NOT the  new user
      expect(
        (await program.account.marker.fetch(markerPDA)).linkedWallet.toBase58()
      ).to.not.equal(keyPair.publicKey.toBase58());
  


    const tx = await program.methods
      .updateLinkedWallet(TEST_DOMAIN_LONG)
      .accounts({
        authority: provider.wallet.publicKey,
        user: keyPair.publicKey,
        marker: markerPDA,
      })
      .signers([keyPair])
      .rpc();
    console.log({ tx });

    await sleep(500)

    /// ensure that authority still matches
    expect(
      (await program.account.marker.fetch(markerPDA)).authority.toBase58()
    ).to.equal(provider.wallet.publicKey.toBase58());

    /// ensure created is still true
    expect((await program.account.marker.fetch(markerPDA)).created).to.equal(
      true
    );


    /// ensure that the linked wallet has switched over to the new user
    expect(
      (await program.account.marker.fetch(markerPDA)).linkedWallet.toBase58()
    ).to.equal(keyPair.publicKey.toBase58());


    // /// ensure domain is unchanged
    expect(
      (await program.account.marker.fetch(markerPDA)).domain
    ).to.equal(TEST_DOMAIN_LONG);



  });
});
