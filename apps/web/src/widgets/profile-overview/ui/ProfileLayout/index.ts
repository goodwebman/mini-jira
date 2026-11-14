import { ProfileLayoutAside } from './ProfileLayoutAside';
import { ProfileLayoutMain } from './ProfileLayoutMain';
import { ProfileLayoutRoot } from './ProfileLayoutRoot';

/** `<ProfileLayout>` со слотами `.Main` и `.Aside`. */
export const ProfileLayout = Object.assign(ProfileLayoutRoot, {
  Main: ProfileLayoutMain,
  Aside: ProfileLayoutAside,
});
