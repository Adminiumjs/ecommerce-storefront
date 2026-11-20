/** The desk's start: built in its own task of the round. */
export async function bootDesk(mount: HTMLElement): Promise<void> {
  mount.textContent = "Northline";
}
