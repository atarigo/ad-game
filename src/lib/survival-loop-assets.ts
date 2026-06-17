import heroIdle from "$lib/assets/survival-loop/hero-idle.png?url";
import heroWalk1 from "$lib/assets/survival-loop/hero-walk1.png?url";
import heroWalk2 from "$lib/assets/survival-loop/hero-walk2.png?url";
import heroWork1 from "$lib/assets/survival-loop/hero-work1.png?url";
import heroWork2 from "$lib/assets/survival-loop/hero-work2.png?url";
import heroCarry from "$lib/assets/survival-loop/hero-carry.png?url";
import heroDownIdle from "$lib/assets/survival-loop/hero-down-idle.png?url";
import heroDownWalk1 from "$lib/assets/survival-loop/hero-down-walk1.png?url";
import heroDownWalk2 from "$lib/assets/survival-loop/hero-down-walk2.png?url";
import heroDownWork1 from "$lib/assets/survival-loop/hero-down-work1.png?url";
import heroDownWork2 from "$lib/assets/survival-loop/hero-down-work2.png?url";
import heroUpIdle from "$lib/assets/survival-loop/hero-up-idle.png?url";
import heroUpWalk1 from "$lib/assets/survival-loop/hero-up-walk1.png?url";
import heroUpWalk2 from "$lib/assets/survival-loop/hero-up-walk2.png?url";
import heroUpWork1 from "$lib/assets/survival-loop/hero-up-work1.png?url";
import heroUpWork2 from "$lib/assets/survival-loop/hero-up-work2.png?url";
import heroRightIdle from "$lib/assets/survival-loop/hero-right-idle.png?url";
import heroRightWalk1 from "$lib/assets/survival-loop/hero-right-walk1.png?url";
import heroRightWalk2 from "$lib/assets/survival-loop/hero-right-walk2.png?url";
import heroRightWork1 from "$lib/assets/survival-loop/hero-right-work1.png?url";
import heroRightWork2 from "$lib/assets/survival-loop/hero-right-work2.png?url";
import heroLeftIdle from "$lib/assets/survival-loop/hero-left-idle.png?url";
import heroLeftWalk1 from "$lib/assets/survival-loop/hero-left-walk1.png?url";
import heroLeftWalk2 from "$lib/assets/survival-loop/hero-left-walk2.png?url";
import heroLeftWork1 from "$lib/assets/survival-loop/hero-left-work1.png?url";
import heroLeftWork2 from "$lib/assets/survival-loop/hero-left-work2.png?url";
import clerkIdle from "$lib/assets/survival-loop/clerk-idle.png?url";
import clerkWalk1 from "$lib/assets/survival-loop/clerk-walk1.png?url";
import clerkWalk2 from "$lib/assets/survival-loop/clerk-walk2.png?url";
import clerkWork1 from "$lib/assets/survival-loop/clerk-work1.png?url";
import clerkWork2 from "$lib/assets/survival-loop/clerk-work2.png?url";
import lumberIdle from "$lib/assets/survival-loop/lumber-idle.png?url";
import lumberWalk1 from "$lib/assets/survival-loop/lumber-walk1.png?url";
import lumberWalk2 from "$lib/assets/survival-loop/lumber-walk2.png?url";
import lumberWork1 from "$lib/assets/survival-loop/lumber-work1.png?url";
import lumberWork2 from "$lib/assets/survival-loop/lumber-work2.png?url";
import hunterIdle from "$lib/assets/survival-loop/hunter-idle.png?url";
import hunterWalk1 from "$lib/assets/survival-loop/hunter-walk1.png?url";
import hunterWalk2 from "$lib/assets/survival-loop/hunter-walk2.png?url";
import hunterWork1 from "$lib/assets/survival-loop/hunter-work1.png?url";
import hunterWork2 from "$lib/assets/survival-loop/hunter-work2.png?url";
import boarIdle from "$lib/assets/survival-loop/boar-idle.png?url";
import boarWalk1 from "$lib/assets/survival-loop/boar-walk1.png?url";
import boarWalk2 from "$lib/assets/survival-loop/boar-walk2.png?url";
import boarHit from "$lib/assets/survival-loop/boar-hit.png?url";
import treeFull from "$lib/assets/survival-loop/tree-full.png?url";
import treeDamaged from "$lib/assets/survival-loop/tree-damaged.png?url";
import treeStump from "$lib/assets/survival-loop/tree-stump.png?url";
import woodStation from "$lib/assets/survival-loop/wood-station.png?url";
import meatStation from "$lib/assets/survival-loop/meat-station.png?url";
import mealShop from "$lib/assets/survival-loop/meal-shop.png?url";
import worldMap from "$lib/assets/survival-loop/world-map.png?url";

export const survivalSpriteUrls = {
  heroIdle,
  heroWalk1,
  heroWalk2,
  heroWork1,
  heroWork2,
  heroCarry,
  heroDownIdle,
  heroDownWalk1,
  heroDownWalk2,
  heroDownWork1,
  heroDownWork2,
  heroUpIdle,
  heroUpWalk1,
  heroUpWalk2,
  heroUpWork1,
  heroUpWork2,
  heroRightIdle,
  heroRightWalk1,
  heroRightWalk2,
  heroRightWork1,
  heroRightWork2,
  heroLeftIdle,
  heroLeftWalk1,
  heroLeftWalk2,
  heroLeftWork1,
  heroLeftWork2,
  clerkIdle,
  clerkWalk1,
  clerkWalk2,
  clerkWork1,
  clerkWork2,
  lumberIdle,
  lumberWalk1,
  lumberWalk2,
  lumberWork1,
  lumberWork2,
  hunterIdle,
  hunterWalk1,
  hunterWalk2,
  hunterWork1,
  hunterWork2,
  boarIdle,
  boarWalk1,
  boarWalk2,
  boarHit,
  treeFull,
  treeDamaged,
  treeStump,
  woodStation,
  meatStation,
  mealShop,
  worldMap,
};

export type SurvivalSpriteKey = keyof typeof survivalSpriteUrls;
