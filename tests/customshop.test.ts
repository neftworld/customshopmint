import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Customshop } from "../target/types/customshop";
import {
  createMint,
  burn,
  mintToChecked,
  createAssociatedTokenAccount,
  transferChecked,
  TOKEN_PROGRAM_ID,
  Mint,
  getMint,
} from "@solana/spl-token";
import { before } from "mocha";
const TEST_DOMAIN_2 = "nft.hedgehog.org";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

chai.use(chaiAsPromised)

function makeid(length) {
  var result = "";
  var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function createNewMint(
  provider: anchor.Provider,
  originalMinter: Keypair
) {
  const mint = await createMint(
    provider.connection,
    originalMinter,
    originalMinter.publicKey,
    originalMinter.publicKey,
    0
  );
  await sleep(500);

  const ata = await createAssociatedTokenAccount(
    provider.connection, // connection
    originalMinter, // fee payer
    mint, // mint
    originalMinter.publicKey // owner,
  );

  await sleep(500);

  await mintToChecked(
    provider.connection,
    originalMinter,
    mint,
    ata,
    originalMinter,
    1,
    0
  );
  await sleep(500);

  return { mint, ata };
}

interface IDomainAndPDA {
  testDomain: string;
  markerPDA: PublicKey;
}

interface IMintAndAta {
  mint: PublicKey;
  ata: PublicKey;
}

const burnMarkerAndMint = async (
  program: anchor.Program<Customshop>,
  provider: anchor.AnchorProvider,
  owner: Keypair,
  mint: PublicKey,
  ata: PublicKey,
  domainAndPDA: IDomainAndPDA
) => {
  return await program.methods
    .burnMarkerAndMint(domainAndPDA.testDomain)
    .accounts({
      authority: provider.wallet.publicKey,
      owner: owner.publicKey,
      marker: domainAndPDA.markerPDA,
      mint,
      tokenAccount: ata,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([owner])
    .rpc();
};

const createMarker = async (
  program: anchor.Program<Customshop>,
  provider: anchor.AnchorProvider,
  minter: Keypair,
  mintAndAta: IMintAndAta,
  domainAndPDA: IDomainAndPDA
) => {
  return await program.methods
    .createMarker(domainAndPDA.testDomain)
    .accounts({
      authority: provider.wallet.publicKey,
      owner: minter.publicKey,
      marker: domainAndPDA.markerPDA,
      mint: mintAndAta.mint.toBase58(),
      tokenAccount: mintAndAta.ata,
    })
    .signers([minter])
    .rpc();
};
const transferMint = async (
  provider: anchor.Provider,
  mint: PublicKey,
  ata: PublicKey,
  originalOwner: Keypair,
  newOwner: Keypair
) => {
  await provider.connection.requestAirdrop(
    newOwner.publicKey,
    5 * LAMPORTS_PER_SOL
  );
  await sleep(500);

  const newAta = await createAssociatedTokenAccount(
    provider.connection, // connection
    newOwner, // fee payer
    mint, // mint
    newOwner.publicKey // owner,
  );

  await transferChecked(
    provider.connection,
    newOwner, //payer
    ata, // source
    mint, // mint
    newAta, // destination
    originalOwner, // owner
    1, //amount
    0 // decimals
  );

  await sleep(500);
  return { newAta };
};

const createDomainAndPDA = async (
  provider: anchor.Provider,
  program: anchor.Program<Customshop>
) => {
  const testDomain = `${makeid(10)}.hedgehog.com`;
  const markerPDA = (
    await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("marker"),
        anchor.utils.bytes.utf8.encode(testDomain),
      ],
      program.programId
    )
  )[0];
  return { testDomain, markerPDA };
};

const createMinter = async (provider: anchor.Provider) => {
  const minter = Keypair.generate();
  await provider.connection.requestAirdrop(
    minter.publicKey,
    5 * LAMPORTS_PER_SOL
  );

  await sleep(500);

  return minter;
};

const beforeWrapper = (fn: () => Promise<any>) => () => {
  return new Promise((resolve, reject) => {
    sleep(0).then(async () => {
      try {
        await fn();
        resolve(0);
      } catch (e) {
        reject(e);
      }
    });
  });
};

describe("Customshop", async () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.Customshop as Program<Customshop>;

  describe("given original owner Keypair is funded", async () => {
    let originalMinter: Keypair = undefined!;
    before(
      beforeWrapper(async () => {
        originalMinter = await createMinter(provider);
      })
    );
    describe(`given that mint has been created and is owned by the claimant`, async () => {
      let mintAndAta: IMintAndAta = undefined!;

      let domainAndPDA: {
        testDomain: string;
        markerPDA: PublicKey;
      } = undefined!;
      before(
        beforeWrapper(async () => {
          mintAndAta = await createNewMint(provider, originalMinter);
          domainAndPDA = await createDomainAndPDA(provider, program);

          await sleep(500);
          // console.log({provider, originalMinter})
        })
      );

      describe("given that the marker has been created", async () => {
        before(
          beforeWrapper(async () => {
            await createMarker(
              program,
              provider,
              originalMinter,
              mintAndAta,
              domainAndPDA
            );
            await sleep(500);
          })
        );

        it("marker should have the correct authority", async () => {
          expect(
            (
              await program.account.marker.fetch(domainAndPDA.markerPDA)
            ).authority.toBase58()
          ).to.equal(provider.wallet.publicKey.toBase58());
        });
        it("marker should have the correct domain", async () => {
          expect(
            (await program.account.marker.fetch(domainAndPDA.markerPDA)).domain
          ).to.equal(domainAndPDA.testDomain);
        });
        it("marker should have the correct mint", async () => {
          expect(
            (
              await program.account.marker.fetch(domainAndPDA.markerPDA)
            ).mint.toBase58()
          ).to.equal(mintAndAta.mint.toBase58());
        });

        describe("given that the mint has been transferred to a new owner", () => {
          let newOwner: Keypair = undefined!;
          let newAta: PublicKey = undefined;

          before(
            beforeWrapper(async () => {
              newOwner = await createMinter(provider);
              newAta = await createAssociatedTokenAccount(
                provider.connection, // connection
                newOwner, // fee payer
                mintAndAta.mint, // mint
                newOwner.publicKey // owner,
              );

              await transferChecked(
                provider.connection,
                newOwner, //payer
                mintAndAta.ata, // source
                mintAndAta.mint, // mint
                newAta, // destination
                originalMinter, // owner
                1, //amount
                0 // decimals
              );

              await sleep(500);
            })
          );
          // // it("Claiming the marker by new owner should succeed", async () => {
          // //   await program.methods
          // //     .updateOwner(domainAndPDA.testDomain)
          // //     .accounts({
          // //       owner: newOwner.publicKey,
          // //       authority: provider.wallet.publicKey,
          // //       marker: domainAndPDA.markerPDA,
          // //       tokenAccount: newAta,
          // //     })
          // //     .signers([newOwner])
          // //     .rpc();
          // //   await sleep(500);
          // // });
          // it("Owner should be updated", async () => {
          //   /// ensure that the linked wallet has switched over to the new owner
          //   expect(
          //     (
          //       await program.account.marker.fetch(domainAndPDA.markerPDA)
          //     ).owner.toBase58()
          //   ).to.equal(newOwner.publicKey.toBase58());
          // });

          // it("Authority should be unchanged", async () => {
          //   expect(
          //     (
          //       await program.account.marker.fetch(domainAndPDA.markerPDA)
          //     ).authority.toBase58()
          //   ).to.equal(provider.wallet.publicKey.toBase58());
          // });

          // it("Domain should be unchanged", async () => {
          //   // /// ensure domain is unchanged
          //   expect(
          //     (await program.account.marker.fetch(domainAndPDA.markerPDA))
          //       .domain
          //   ).to.equal(domainAndPDA.testDomain);
          // });

          it("Old owner should not be able to burn the marker", async () => {
            // /// ensure domain is unchanged

            await expect(
              new Promise((resolve, reject) => {
                burnMarkerAndMint(
                  program,
                  provider,
                  originalMinter,
                  mintAndAta.mint,
                  mintAndAta.ata,
                  domainAndPDA
                ).then(result=>resolve('success')).catch(error=>{
                  reject(new Error(error))
                });
              })
            ).to.be.rejectedWith(Error, "AnchorError caused by account: token_account. Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated");
          });
          it("After unsuccessful attempt to burn, mint supply should be 1 ", async () => {
            const mintInfo = await getMint(
              provider.connection,
              mintAndAta.mint
            );
            expect(Number(mintInfo.supply)).to.equal(1);
          });
          it("After unsuccessful attempt to burn, marker account should not be closed ", async () => {
            let markerInfo = await provider.connection.getAccountInfo(
              domainAndPDA.markerPDA
            );
            expect(markerInfo).to.not.equal(null);
          });
          it("New owner should be able to burn marker and the mint", async () => {
            // /// ensure domain is unchanged
            await burnMarkerAndMint(
              program,
              provider,
              newOwner,
              mintAndAta.mint,
              newAta,
              domainAndPDA
            );
            await sleep(1500);
          });
          it("After burning, mint supply should be 0", async () => {
            const mintInfo = await getMint(
              provider.connection,
              mintAndAta.mint
            );
            expect(Number(mintInfo.supply)).to.equal(0);
          });
          it("After burning, the marker account should be closed", async () => {
            const markerInfo = await provider.connection.getAccountInfo(
              domainAndPDA.markerPDA
            );
            expect(markerInfo).to.equal(null);
          });

        });
      });
    });

  });
});
